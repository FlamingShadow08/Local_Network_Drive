const fileInput = document.getElementById("fileInput");
let progressTimeout = null;

function upload() {
    fileInput.click();
}

fileInput.addEventListener("change", async () => {
    if (!fileInput.files.length) return;

    for (const file of fileInput.files) {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/?path=${encodeURIComponent(CURRENT_PATH)}`);

        const start = performance.now();
        showProgress(`Uploading ${file.name} … 0%`);

        xhr.upload.onprogress = e => {
            if (!e.lengthComputable) return;
            const percent = Math.round((e.loaded / e.total) * 100);
            const elapsed = (performance.now() - start) / 1000;
            const speed = elapsed > 0.4 ? e.loaded / elapsed : 0;
            setProgress(percent, `${percent}%  —  ${formatSpeed(speed)}`);
        };

        xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 302) {
                setProgress(100, "Upload complete");
                setTimeout(() => {
                    hideProgress();
                    if (file === fileInput.files[fileInput.files.length - 1]) {
                        location.reload();
                    }
                }, 700);
            } else {
                hideProgress();
                alert(`Upload failed (${xhr.status})`);
            }
        };

        xhr.onerror = () => {
            hideProgress();
            alert("Network error during upload");
        };

        xhr.send(formData);
    }
});

async function downloadFile(filename) {
    showProgress("Preparing download…");
    startSafetyTimer();

    try {
        const url = `/download?path=${encodeURIComponent(CURRENT_PATH)}&file=${encodeURIComponent(filename)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const total = Number(response.headers.get("Content-Length")) || 0;
        const reader = response.body.getReader();
        let received = 0;
        let start = performance.now();
        let lastUI = start;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;

            const now = performance.now();
            if (now - lastUI > 400) {
                const elapsed = (now - start) / 1000;
                const pct = total ? Math.round(received / total * 100) : 0;
                const speed = elapsed > 0.5 ? received / elapsed : 0;
                setProgress(pct, `${pct}%  —  ${formatSpeed(speed)}`);
                lastUI = now;
            }
        }

        const elapsed = (performance.now() - start) / 1000;
        setProgress(100, `100%  —  ${formatSpeed(received / elapsed)}`);

        const blob = new Blob(chunks);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(link.href);
            setTimeout(hideProgress, 900);
        }, 120);

    } catch (err) {
        console.error(err);
        alert("Download failed");
        hideProgress();
    }
}

function newFolder() {
    const name = prompt("New folder name:");
    if (!name?.trim()) return;
    document.getElementById("folderInput").value = name.trim();
    document.getElementById("folderForm").submit();
}

function confirmDelete(name) {
    if (!confirm(`Delete "${name}" permanently?`)) return;
    document.getElementById("deleteName").value = name;
    document.getElementById("deleteForm").submit();
}

// ────────────────────────────────────────────────
//  Progress helpers
// ────────────────────────────────────────────────

function showProgress(text) {
    clearTimeout(progressTimeout);
    document.getElementById("progressText").textContent = text;
    document.getElementById("progressFill").style.width = "0%";
    document.getElementById("progressOverlay").style.display = "flex";
}

function setProgress(percent, text = null) {
    document.getElementById("progressFill").style.width = percent + "%";
    if (text) document.getElementById("progressText").textContent = text;
}

function hideProgress() {
    clearTimeout(progressTimeout);
    document.getElementById("progressOverlay").style.display = "none";
}

function startSafetyTimer() {
    clearTimeout(progressTimeout);
    progressTimeout = setTimeout(hideProgress, 25000);
}

function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec < 1) return "—";
    if (bytesPerSec < 1024)    return bytesPerSec.toFixed(0)     + " B/s";
    if (bytesPerSec < 1_048_576) return (bytesPerSec/1024).toFixed(1)   + " KB/s";
    return (bytesPerSec/1_048_576).toFixed(1) + " MB/s";
}

document.addEventListener("DOMContentLoaded", hideProgress);