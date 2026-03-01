"""Minimal MCP client over stdio transport — stdlib only."""

import json
import logging
import os
import subprocess
import threading
import time

logger = logging.getLogger(__name__)


class McpError(Exception):
    """Raised when the MCP server returns a JSON-RPC error response."""

    def __init__(self, code: int, message: str):
        super().__init__(f"MCP error {code}: {message}")
        self.code = code
        self.message = message


class McpClient:
    """JSON-RPC 2.0 client for MCP servers over stdio transport.

    Spawns the server as a subprocess and communicates via
    newline-delimited JSON on stdin/stdout.
    """

    PROTOCOL_VERSION = "2024-11-05"
    CLIENT_INFO = {"name": "context-visualizer", "version": "0.1.0"}
    DEFAULT_TIMEOUT = 10  # seconds

    def __init__(
        self,
        command: str,
        args: list[str],
        env: dict | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self._command = command
        self._args = args
        self._env = env  # extra env vars to merge; None means no extras
        self._timeout = timeout
        self._process: subprocess.Popen | None = None
        self._request_id = 0
        self._connected = False
        self._server_info: dict | None = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def server_info(self) -> dict | None:
        return self._server_info

    def connect(self) -> bool:
        """Spawn server subprocess and perform the MCP initialize handshake.

        Returns True on success, False on any failure (logs the reason).
        """
        try:
            merged_env = {**os.environ}
            if self._env:
                merged_env.update(self._env)

            self._process = subprocess.Popen(
                [self._command] + self._args,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=merged_env,
            )

            # Send initialize request
            req_id = self._send_request(
                "initialize",
                {
                    "protocolVersion": self.PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": self.CLIENT_INFO,
                },
            )
            response = self._read_response(req_id)

            if "error" in response:
                err = response["error"]
                raise McpError(err.get("code", -1), err.get("message", "unknown"))

            self._server_info = response.get("result", {}).get("serverInfo")

            # Send initialized notification (fire-and-forget — no response expected)
            self._send_notification("notifications/initialized", {})

            self._connected = True
            logger.info("MCP client connected; server=%s", self._server_info)
            return True

        except Exception as exc:
            logger.warning("MCP connect failed: %s", exc)
            self._kill_process()
            self._connected = False
            return False

    def disconnect(self) -> None:
        """Terminate the server subprocess cleanly."""
        self._connected = False
        self._server_info = None
        self._kill_process()

    def call_tool(self, name: str, arguments: dict) -> dict:
        """Call an MCP tool and return the parsed result.

        Raises RuntimeError if not connected.
        Raises McpError if the server returns an error response.
        Attempts one reconnect if the process has died.
        """
        self._ensure_connected()

        req_id = self._send_request("tools/call", {"name": name, "arguments": arguments})
        response = self._read_response(req_id)

        if "error" in response:
            err = response["error"]
            raise McpError(err.get("code", -1), err.get("message", "unknown"))

        return self._extract_tool_result(response.get("result", {}))

    def list_tools(self) -> list[dict]:
        """Return the list of tool descriptors from the server.

        Raises RuntimeError if not connected.
        """
        self._ensure_connected()

        req_id = self._send_request("tools/list", {})
        response = self._read_response(req_id)

        if "error" in response:
            err = response["error"]
            raise McpError(err.get("code", -1), err.get("message", "unknown"))

        return response.get("result", {}).get("tools", [])

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _send_request(self, method: str, params: dict) -> int:
        """Write a JSON-RPC request to stdin; return the request id."""
        with self._lock:
            self._request_id += 1
            req_id = self._request_id
            msg = {
                "jsonrpc": "2.0",
                "id": req_id,
                "method": method,
                "params": params,
            }
            line = json.dumps(msg) + "\n"
            self._process.stdin.write(line.encode())
            self._process.stdin.flush()
        return req_id

    def _send_notification(self, method: str, params: dict) -> None:
        """Write a JSON-RPC notification (no id, no response expected)."""
        with self._lock:
            msg = {"jsonrpc": "2.0", "method": method, "params": params}
            line = json.dumps(msg) + "\n"
            self._process.stdin.write(line.encode())
            self._process.stdin.flush()

    def _read_response(self, expected_id: int) -> dict:
        """Read lines from stdout until a response with expected_id is found.

        Skips notification messages (no 'id' field).
        Raises TimeoutError if nothing matches within self._timeout seconds.
        """
        deadline = time.monotonic() + self._timeout
        while time.monotonic() < deadline:
            # Non-blocking readline with a short poll interval
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            line = self._readline_with_timeout(min(remaining, 0.1))
            if line is None:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                logger.debug("MCP: ignoring non-JSON line: %r", line)
                continue

            if "id" not in msg:
                # Notification — skip
                logger.debug("MCP: skipping notification: method=%s", msg.get("method"))
                continue

            if msg["id"] == expected_id:
                return msg

            logger.debug("MCP: got response for id=%s, expected %s — skipping", msg["id"], expected_id)

        raise TimeoutError(
            f"MCP server did not respond to request {expected_id} within {self._timeout}s"
        )

    def _readline_with_timeout(self, timeout: float) -> str | None:
        """Read one line from stdout with a timeout.

        Returns the decoded line (without newline) or None on timeout/EOF.
        Uses select on unix; falls back to a thread-based approach.
        """
        import select

        try:
            ready, _, _ = select.select([self._process.stdout], [], [], timeout)
        except (ValueError, OSError):
            return None

        if not ready:
            return None

        raw = self._process.stdout.readline()
        if not raw:
            return None
        return raw.decode(errors="replace").rstrip("\n")

    def _ensure_connected(self) -> None:
        """Raise RuntimeError if not connected; attempt reconnect if process died."""
        if not self._connected:
            raise RuntimeError("MCP client is not connected")

        # If the process has exited, try one reconnect
        if self._process is not None and self._process.poll() is not None:
            logger.warning("MCP server process died; attempting reconnect")
            self._connected = False
            if not self.connect():
                raise RuntimeError("MCP server process died and reconnect failed")

    def _extract_tool_result(self, result: dict) -> dict:
        """Extract the payload from an MCP tool result envelope.

        MCP tools return: { content: [{ type: "text", text: "..." }] }
        If there is a single text block, parse its text as JSON and return
        the parsed dict.  Otherwise return the raw result.
        """
        content = result.get("content", [])
        if len(content) == 1 and content[0].get("type") == "text":
            text = content[0].get("text", "")
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
        return result

    def _kill_process(self) -> None:
        """Terminate the subprocess if running."""
        if self._process is None:
            return
        try:
            if self._process.poll() is None:
                self._process.terminate()
                try:
                    self._process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    self._process.kill()
                    self._process.wait()
        except OSError:
            pass
        finally:
            self._process = None
