const UPLOAD_API = "https://1v3uvvguul.execute-api.ap-south-1.amazonaws.com/upload";

const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const status = document.getElementById("status");

let selectedFile = null;

dropArea.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  fileName.innerText = selectedFile ? `Selected: ${selectedFile.name}` : "";
});

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("border-blue-500");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("border-blue-500");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("border-blue-500");

  selectedFile = e.dataTransfer.files[0];

  if (selectedFile) {
    fileName.innerText = `Selected: ${selectedFile.name}`;
  }
});

async function uploadFile() {

  if (!selectedFile) {
    status.innerText = "Please select a CSV file";
    return;
  }

  status.innerText = "Requesting upload URL...";

  try {

    const response = await fetch(UPLOAD_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName: selectedFile.name,
        fileType: selectedFile.type
      })
    });

    const data = await response.json();

    const uploadUrl = data.uploadUrl;

    status.innerText = "Uploading file...";

    await fetch(uploadUrl, {
      method: "PUT",
      body: selectedFile,
      headers: {
        "Content-Type": selectedFile.type
      }
    });

    status.innerText = "Upload successful. Processing started.";

  } catch (err) {
    console.error(err);
    status.innerText = "Upload failed";
  }
}