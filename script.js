const captureButton = document.getElementById('captureButton');
const videoElement = document.getElementById('video');
const canvas = document.getElementById('canvas');
const gridCanvas = document.getElementById('photoGridCanvas');
const photoGrid = document.getElementById('photoGrid');
const downloadButton = document.getElementById('downloadButton');
const layoutButtons = document.querySelectorAll('.layout-button');
const filterButtons = document.querySelectorAll('.filter-button');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const retakeButtonsContainer = document.getElementById('retakeButtonsContainer');
const context = canvas.getContext('2d');
const gridContext = gridCanvas.getContext('2d');

let stream;
let capturedImages = [];
let selectedLayout = null;
let selectedFilter = 'none';

window.onload = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Your browser does not support camera access.');
        return;
    }

    loadingMessage.style.display = 'block';

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",  // Use "environment" for rear camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        videoElement.srcObject = stream;
        captureButton.style.display = 'inline-block';
        loadingMessage.style.display = 'none';
    } catch (error) {
        showError('Error accessing camera. Please check your settings.');
    }
};

function showError(message) {
    loadingMessage.style.display = 'none';
    errorMessage.style.display = 'block';
    errorMessage.innerText = message;
}

// Layout Selection
layoutButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        layoutButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const layout = event.target.dataset.layout.split('x');
        selectedLayout = {
            rows: parseInt(layout[1]),
            cols: parseInt(layout[0]),
            total: parseInt(layout[0]) * parseInt(layout[1])
        };
    });
});

// Filter Selection
filterButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        selectedFilter = event.target.dataset.filter;

        // iOS Safari does not support `filter` on live video, so apply it only to the canvas
        videoElement.style.filter = selectedFilter;
    });
});

// Capture Button
captureButton.addEventListener('click', async () => {
    if (!selectedLayout) {
        alert("Please select a layout before capturing.");
        return;
    }

    captureButton.disabled = true;
    capturedImages = [];

    for (let i = 0; i < selectedLayout.total; i++) {
        await countdown();
        capturePhoto();
        await delay(1000);
    }

    generatePhotoGrid();
    createRetakeButtons();

    captureButton.disabled = false;
    captureButton.innerText = "Again";
});

// Capture Image
function capturePhoto() {
    captureImageToCanvas();
    capturedImages.push(canvas.toDataURL('image/jpeg', 0.95));
}

function captureImageToCanvas() {
    const scaleFactor = 2;
    canvas.width = videoElement.videoWidth * scaleFactor;
    canvas.height = videoElement.videoHeight * scaleFactor;

    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.filter = selectedFilter;  // Apply filter only to the captured image
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    context.restore();
}

// Generate Photo Grid
function generatePhotoGrid() {
    if (capturedImages.length !== selectedLayout.total) return;

    const gap = 10;
    const photoWidth = 250;
    const photoHeight = Math.round(photoWidth * (videoElement.videoHeight / videoElement.videoWidth));
    const gridWidth = selectedLayout.cols * (photoWidth + gap) + 10;
    const gridHeight = selectedLayout.rows * (photoHeight + gap) + 50;

    gridCanvas.width = gridWidth;
    gridCanvas.height = gridHeight;
    gridContext.fillStyle = "#f1f1f1";
    gridContext.fillRect(0, 0, gridWidth, gridHeight);

    let loadedImages = 0;

    capturedImages.forEach((imgSrc, index) => {
        let row = index % selectedLayout.rows;
        let col = Math.floor(index / selectedLayout.rows);
        let x = col * (photoWidth + gap) + 10;
        let y = row * (photoHeight + gap) + 10;

        let img = new Image();
        img.src = imgSrc;
        img.onload = () => {
            gridContext.fillStyle = "black";
            gridContext.fillRect(x - 1, y - 1, photoWidth + 2, photoHeight + 2);
            gridContext.drawImage(img, x, y, photoWidth, photoHeight);

            loadedImages++;
            if (loadedImages === capturedImages.length) {
                const currentDate = new Date();
                const dateString = currentDate.toLocaleDateString('en-US', {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit'
                });

                gridContext.fillStyle = "black";
                gridContext.font = "20px Arial";
                gridContext.textAlign = "center";
                gridContext.fillText(dateString, gridWidth / 2, gridHeight - 20);

                photoGrid.src = "";
                setTimeout(() => {
                    photoGrid.src = gridCanvas.toDataURL('image/jpeg', 0.95);
                    photoGrid.style.display = 'block';
                    downloadButton.style.display = 'inline-block';
                }, 100);
            }
        };
    });
}

// Create Retake Buttons
function createRetakeButtons() {
    retakeButtonsContainer.innerHTML = '';
    for (let i = 0; i < selectedLayout.total; i++) {
        const retakeBtn = document.createElement('button');
        retakeBtn.innerText = `Retake ${i + 1}`;
        retakeBtn.classList.add('retake-btn');
        retakeBtn.dataset.index = i;
        retakeBtn.addEventListener('click', async (event) => {
            const photoIndex = parseInt(event.target.dataset.index);
            await replacePhoto(photoIndex);
        });
        retakeButtonsContainer.appendChild(retakeBtn);
    }
}

// Retake a Photo
async function replacePhoto(index) {
    await countdown();
    captureImageToCanvas();
    capturedImages[index] = canvas.toDataURL('image/jpeg', 0.95);
    generatePhotoGrid();
}

// Download Photo Grid
downloadButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = gridCanvas.toDataURL('image/jpeg', 0.95);
    link.download = 'photo_grid.jpg';
    link.click();
});

// Countdown Before Capture
function countdown() {
    return new Promise((resolve) => {
        let count = 2;
        const countdownInterval = setInterval(() => {
            captureButton.innerText = count > 0 ? `📸 ${count}...` : "SNAP!";
            if (count === 0) {
                clearInterval(countdownInterval);
                resolve();
            }
            count--;
        }, 1000);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
