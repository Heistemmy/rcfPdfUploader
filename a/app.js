// Set up IndexedDB
let db;
const request = indexedDB.open("pdfUploaderDB", 1);

request.onupgradeneeded = function (event) {
  db = event.target.result;
  db.createObjectStore("pdfs", { keyPath: "name" });
};

request.onsuccess = function (event) {
  db = event.target.result;
  loadStoredPDFs(); // Load stored PDFs
};

// Handle file uploads
document.getElementById('pdfForm').addEventListener('submit', function (event) {
  event.preventDefault();
  const fileInput = document.getElementById('fileInput');
  const files = fileInput.files;
  handleFiles(files);
});

async function handleFiles(files) {
  for (let file of files) {
    if (file.type === 'application/pdf') {
      const compressedPDF = await compressPDF(file);
      const fileURL = URL.createObjectURL(compressedPDF);
      storePDF(file.name, compressedPDF); // Store the compressed PDF
      displayPDF(file.name, fileURL); // Display the compressed PDF
    } else {
      alert('Only PDF files are allowed.');
    }
  }
}

// Compress the PDF using pdf-lib
async function compressPDF(file) {
  const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
  const newPdfDoc = await PDFLib.PDFDocument.create();

  const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
  newPdfDoc.addPage(firstPage);

  const compressedPdfBytes = await newPdfDoc.save();
  return new Blob([compressedPdfBytes], { type: "application/pdf" });
}

// Store the PDF in IndexedDB
function storePDF(name, fileBlob) {
  const reader = new FileReader();
  reader.onload = function () {
    const transaction = db.transaction(["pdfs"], "readwrite");
    const pdfStore = transaction.objectStore("pdfs");
    const pdfData = { name, dataURL: reader.result };
    pdfStore.put(pdfData); // Add or update the file in the database
  };
  reader.readAsDataURL(fileBlob);
}

// Load and display stored PDFs
function loadStoredPDFs() {
  const transaction = db.transaction(["pdfs"], "readonly");
  const pdfStore = transaction.objectStore("pdfs");
  const request = pdfStore.openCursor();
  request.onsuccess = function (event) {
    const cursor = event.target.result;
    if (cursor) {
      displayPDF(cursor.value.name, cursor.value.dataURL);
      cursor.continue();
    }
  };
}

// Display a PDF in the list with Download option
function displayPDF(name, url) {
  const pdfList = document.getElementById('pdfList');
  const pdfItem = document.createElement('div');
  pdfItem.className = 'pdf-item';

  const iframe = document.createElement('iframe');
  iframe.src = url;

  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.className = 'download-btn';
  downloadBtn.onclick = () => downloadPDF(name, url);

  const pdfName = document.createElement('span');
  pdfName.textContent = name;

  pdfItem.appendChild(iframe);
  pdfItem.appendChild(pdfName);
  pdfItem.appendChild(downloadBtn);
  pdfList.appendChild(pdfItem);
}

// Download the PDF
function downloadPDF(name, url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
