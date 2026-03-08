const socket = io();

let currentRoom = "general";
let username = null;

const channelList = document.getElementById("channel-list");
const messagesEl = document.getElementById("messages");
const userListEl = document.getElementById("user-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const currentRoomNameEl = document.getElementById("current-room-name");
const currentUsernameEl = document.getElementById("current-username");

function promptUsername() {
  let name = "";
  while (!name) {
    name = window.prompt("Enter a username for Shat:");
    if (name === null) {
      name = "Guest" + Math.floor(Math.random() * 1000);
      break;
    }
  }
  return name.trim() || "Guest" + Math.floor(Math.random() * 1000);
}

function joinRoom(room) {
  currentRoom = room;
  messagesEl.innerHTML = "";
  userListEl.innerHTML = "";
  currentRoomNameEl.textContent = `# ${room}`;
  messageInput.placeholder = `Message #${room}`;

  socket.emit("joinRoom", { username, room });
}

function addMessage({ system, user, text, time }) {
  const msg = document.createElement("div");
  msg.classList.add("message");
  if (system) msg.classList.add("system");

  const date = new Date(time);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  msg.innerHTML = `
    <div class="meta">
      <span class="username">${user}</span>
      <span class="time">${timeStr}</span>
    </div>
    <div class="text">${escapeHtml(text)}</div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateUserList(users) {
  userListEl.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    userListEl.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Init
username = promptUsername();
currentUsernameEl.textContent = username;
joinRoom(currentRoom);

// Socket events
socket.on("message", (msg) => {
  addMessage(msg);
});

socket.on("roomUsers", ({ room, users }) => {
  if (room === currentRoom) {
    updateUserList(users);
  }
});

// Channel switching
channelList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-room]");
  if (!li) return;

  const room = li.getAttribute("data-room");
  if (room === currentRoom) return;

  document
    .querySelectorAll("#channel-list li")
    .forEach((el) => el.classList.remove("active"));
  li.classList.add("active");

  joinRoom(room);
});

// Sending messages
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", { room: currentRoom, text });
  messageInput.value = "";
  messageInput.focus();
});
