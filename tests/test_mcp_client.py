"""Unit tests for McpClient — mocks subprocess.Popen throughout."""

import io
import json
import subprocess
import threading
import unittest
from unittest.mock import MagicMock, patch, PropertyMock

from mcp_client import McpClient, McpError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(req_id: int, result: dict) -> bytes:
    """Build a JSON-RPC success response line."""
    msg = {"jsonrpc": "2.0", "id": req_id, "result": result}
    return (json.dumps(msg) + "\n").encode()


def _make_error_response(req_id: int, code: int, message: str) -> bytes:
    """Build a JSON-RPC error response line."""
    msg = {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}
    return (json.dumps(msg) + "\n").encode()


def _make_notification(method: str) -> bytes:
    """Build a JSON-RPC notification line (no id)."""
    msg = {"jsonrpc": "2.0", "method": method, "params": {}}
    return (json.dumps(msg) + "\n").encode()


def _mock_process(stdout_bytes: bytes) -> MagicMock:
    """Return a mock Popen process whose stdout yields stdout_bytes."""
    proc = MagicMock()
    proc.stdin = MagicMock()
    proc.stdout = io.BytesIO(stdout_bytes)
    proc.stderr = io.BytesIO(b"")
    proc.poll.return_value = None  # process alive by default
    return proc


def _fake_select(rlist, _wlist, _xlist, timeout=None):
    """Replacement for select.select that works with BytesIO objects.

    BytesIO lacks fileno(), so real select() fails.  This shim reports
    the stream as ready when it has remaining data, or empty (timeout)
    when the stream is exhausted — matching the real behavior for tests.
    """
    ready = []
    for fd in rlist:
        if hasattr(fd, "read"):
            pos = fd.tell()
            chunk = fd.read(1)
            fd.seek(pos)
            if chunk:
                ready.append(fd)
    return ready, [], []


# ---------------------------------------------------------------------------
# Task 3: connect / disconnect / transport tests
# ---------------------------------------------------------------------------

@patch("mcp_client.select.select", side_effect=_fake_select)
class TestMcpClientConnect(unittest.TestCase):

    def _init_response(self) -> bytes:
        return _make_response(1, {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "serverInfo": {"name": "context-forge", "version": "1.0.0"},
        })

    @patch("subprocess.Popen")
    def test_connect_success(self, mock_popen, _mock_select):
        """connect() performs initialize handshake; connected=True, server_info populated."""
        proc = _mock_process(self._init_response())
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"])
        result = client.connect()

        self.assertTrue(result)
        self.assertTrue(client.connected)
        self.assertEqual(client.server_info, {"name": "context-forge", "version": "1.0.0"})

    @patch("subprocess.Popen")
    def test_connect_sends_initialize_request(self, mock_popen, _mock_select):
        """connect() writes an initialize JSON-RPC request to stdin."""
        proc = _mock_process(self._init_response())
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"])
        client.connect()

        written = b"".join(
            call.args[0] for call in proc.stdin.write.call_args_list
        )
        # First line is the initialize request; second is the notification
        first_line = written.decode().splitlines()[0]
        msg = json.loads(first_line)
        self.assertEqual(msg["method"], "initialize")
        self.assertEqual(msg["jsonrpc"], "2.0")
        self.assertIn("clientInfo", msg["params"])

    @patch("subprocess.Popen")
    def test_connect_sends_initialized_notification(self, mock_popen, _mock_select):
        """connect() sends notifications/initialized after initialize response."""
        proc = _mock_process(self._init_response())
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"])
        client.connect()

        all_written = b"".join(
            call.args[0] for call in proc.stdin.write.call_args_list
        )
        lines = [l for l in all_written.decode().strip().splitlines() if l]
        methods = [json.loads(l)["method"] for l in lines]
        self.assertIn("notifications/initialized", methods)

    @patch("subprocess.Popen")
    def test_connect_failure_process_raises(self, mock_popen, _mock_select):
        """connect() returns False and connected=False when Popen raises."""
        mock_popen.side_effect = FileNotFoundError("command not found")

        client = McpClient("nonexistent", [])
        result = client.connect()

        self.assertFalse(result)
        self.assertFalse(client.connected)

    @patch("subprocess.Popen")
    def test_connect_failure_no_response(self, mock_popen, _mock_select):
        """connect() returns False when server sends no response (timeout)."""
        proc = _mock_process(b"")  # empty stdout
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"], timeout=0.1)
        result = client.connect()

        self.assertFalse(result)
        self.assertFalse(client.connected)


@patch("mcp_client.select.select", side_effect=_fake_select)
class TestMcpClientDisconnect(unittest.TestCase):

    @patch("subprocess.Popen")
    def test_disconnect_cleans_up(self, mock_popen, _mock_select):
        """disconnect() terminates process and sets connected=False."""
        init_bytes = _make_response(1, {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "serverInfo": {"name": "test"},
        })
        proc = _mock_process(init_bytes)
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"])
        client.connect()
        self.assertTrue(client.connected)

        client.disconnect()

        self.assertFalse(client.connected)
        self.assertIsNone(client.server_info)
        proc.terminate.assert_called_once()

    def test_disconnect_when_not_connected_is_safe(self, _mock_select):
        """disconnect() on a never-connected client does not raise."""
        client = McpClient("node", ["server.js"])
        client.disconnect()  # should not raise
        self.assertFalse(client.connected)


@patch("mcp_client.select.select", side_effect=_fake_select)
class TestMcpClientReadResponse(unittest.TestCase):

    @patch("subprocess.Popen")
    def test_read_response_timeout(self, mock_popen, _mock_select):
        """_read_response raises TimeoutError when server sends nothing."""
        proc = _mock_process(b"")
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"], timeout=0.1)
        client._process = proc  # inject directly to bypass connect

        with self.assertRaises(TimeoutError):
            client._read_response(1)

    @patch("subprocess.Popen")
    def test_notification_skipped_before_response(self, mock_popen, _mock_select):
        """Notifications (no id) are skipped; correct response is returned."""
        notification = _make_notification("some/notification")
        real_response = _make_response(1, {"result": "ok"})
        proc = _mock_process(notification + real_response)
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"])
        client._process = proc

        msg = client._read_response(1)
        self.assertEqual(msg["id"], 1)
        self.assertEqual(msg["result"], {"result": "ok"})


# ---------------------------------------------------------------------------
# Task 4 tests: call_tool, list_tools, error handling
# ---------------------------------------------------------------------------

@patch("mcp_client.select.select", side_effect=_fake_select)
class TestMcpClientCallTool(unittest.TestCase):

    def _connected_client(self, mock_popen, extra_stdout: bytes = b"") -> McpClient:
        """Return a connected McpClient with mock process."""
        init_bytes = _make_response(1, {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "serverInfo": {"name": "test"},
        })
        proc = _mock_process(init_bytes + extra_stdout)
        mock_popen.return_value = proc
        client = McpClient("node", ["server.js"])
        client.connect()
        return client

    @patch("subprocess.Popen")
    def test_call_tool_happy_path(self, mock_popen, _mock_select):
        """call_tool returns parsed dict from single text content block."""
        payload = {"name": "Test", "description": "A test project"}
        tool_response = _make_response(2, {
            "content": [{"type": "text", "text": json.dumps(payload)}]
        })
        client = self._connected_client(mock_popen, tool_response)

        result = client.call_tool("project_structure", {"projectId": "p1"})

        self.assertEqual(result["name"], "Test")
        self.assertEqual(result["description"], "A test project")

    @patch("subprocess.Popen")
    def test_call_tool_raises_mcp_error(self, mock_popen, _mock_select):
        """call_tool raises McpError when server returns error response."""
        error_response = _make_error_response(2, -32601, "Method not found")
        client = self._connected_client(mock_popen, error_response)

        with self.assertRaises(McpError) as ctx:
            client.call_tool("unknown_tool", {})

        self.assertEqual(ctx.exception.code, -32601)
        self.assertIn("Method not found", ctx.exception.message)

    @patch("subprocess.Popen")
    def test_call_tool_when_disconnected_raises_runtime_error(self, mock_popen, _mock_select):
        """call_tool raises RuntimeError when not connected."""
        client = McpClient("node", ["server.js"])
        # do NOT connect

        with self.assertRaises(RuntimeError):
            client.call_tool("project_list", {})

    @patch("subprocess.Popen")
    def test_call_tool_reconnect_on_dead_process(self, mock_popen, _mock_select):
        """call_tool reconnects when process has died, then succeeds."""
        payload = {"name": "Test"}

        # Simulate: client was connected (proc1), proc1 has since died.
        # On reconnect a new proc2 is spawned; request ids start fresh from
        # the client's perspective at id=1 for initialize, id=2 for the tool.
        init_bytes = _make_response(1, {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "serverInfo": {"name": "test"},
        })
        tool_response = _make_response(2, {
            "content": [{"type": "text", "text": json.dumps(payload)}]
        })

        # proc2 provides both the reconnect initialize response and tool response
        proc2 = _mock_process(init_bytes + tool_response)
        proc2.poll.return_value = None

        # Inject state directly: client believes it's connected with a dead process
        dead_proc = MagicMock()
        dead_proc.poll.return_value = 1  # non-None → process has exited

        mock_popen.return_value = proc2

        client = McpClient("node", ["server.js"])
        # Manually put client into "connected but dead process" state
        client._connected = True
        client._process = dead_proc
        client._request_id = 0  # reset so ids are predictable

        result = client.call_tool("project_list", {})
        self.assertEqual(result["name"], "Test")

    @patch("subprocess.Popen")
    def test_list_tools_returns_tool_list(self, mock_popen, _mock_select):
        """list_tools returns the tools array from the server response."""
        tools = [
            {"name": "project_list", "description": "List projects"},
            {"name": "project_structure", "description": "Get structure"},
        ]
        tool_response = _make_response(2, {"tools": tools})
        init_bytes = _make_response(1, {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "serverInfo": {"name": "test"},
        })
        proc = _mock_process(init_bytes + tool_response)
        mock_popen.return_value = proc

        client = McpClient("node", ["server.js"])
        client.connect()
        result = client.list_tools()

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "project_list")

    @patch("subprocess.Popen")
    def test_list_tools_when_disconnected_raises(self, mock_popen, _mock_select):
        """list_tools raises RuntimeError when not connected."""
        client = McpClient("node", ["server.js"])

        with self.assertRaises(RuntimeError):
            client.list_tools()


if __name__ == "__main__":
    unittest.main()
