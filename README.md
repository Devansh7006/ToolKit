
# ⚡ Cyber Toolkit

> A modular, GUI-based cybersecurity toolkit for network reconnaissance and analysis.



## 🚀 Overview

Cyber Toolkit is a lightweight yet powerful security tool designed to perform essential reconnaissance tasks through a clean web-based interface.

It combines multiple security utilities into a single dashboard, making it easy to scan networks, discover subdomains, enumerate directories, and download files — all from one place.



## 🛠 Features

- 🔍 **ARP Network Scanner**
  - Discover active devices on a network
  - Displays IP ↔ MAC mapping

- 🌐 **Subdomain Enumeration**
  - Brute-force subdomains using wordlists
  - Multi-threaded for fast execution

- 📂 **Directory Enumeration**
  - Finds hidden endpoints on websites
  - Detects `200 OK` and `403 Forbidden`

- ⬇️ **File Downloader**
  - Download files directly from URLs
  - Supports multiple file types

- 🎯 **GUI Dashboard**
  - Clean and modern UI
  - Tab-based navigation
  - Real-time results display


## 🧠 Tech Stack

| Layer       | Technology            |
|------------|----------------------|
| Backend    | FastAPI (Python)     |
| Frontend   | HTML, CSS, JavaScript|
| Networking | Scapy                |
| Requests   | Python Requests      |


## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Devansh7006/ToolKit.git
cd ToolKit
````

---

### 2️⃣ Setup Backend

```bash
cd backend
pip install -r requirements.txt
```

---

### 3️⃣ Run Backend Server

```bash
uvicorn main:app --reload
```

Server will run at:

```
http://127.0.0.1:8000
```

---

### 4️⃣ Run Frontend

Open:

```
frontend/index.html
```

OR (recommended):

```bash
cd frontend
python -m http.server 5500
```

Then open:

```
http://localhost:5500
```

---

## 📸 Screenshots

### 🖥 ARP Network Scan

![ARP Scan](screenshots/arp.png)

### 🌐 Subdomain Enumeration

![Subdomain](screenshots/Subdomain.png)

### 📡 Directory Enumeration

![Directory](screenshots/Dir_En.png)

### 📁 File Downloader

![Downloader](screenshots/download.png)

---

## 🔐 Disclaimer

This tool is developed strictly for **educational and ethical purposes only**.
Do not use it on networks or systems without proper authorization.

---

## 👨‍💻 Author

**Devansh Goyal**

* GitHub: [https://github.com/Devansh7006](https://github.com/Devansh7006)
