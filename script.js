const captureButton = document.getElementById('captureButton');
const videoElement = document.getElementById('video');
const canvas = document.getElementById('canvas');
const gridCanvas = document.getElementById('photoGridCanvas');
const photoGrid = document.getElementById('photoGrid');
const downloadButton = document.getElementById('downloadButton');
const layoutButtons = document.querySelectorAll('.layout-button');
const filterButtons = document.querySelectorAll('.filter-button'); // Filter buttons
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const retakeButtonsContainer = document.getElementById('retakeButtonsContainer');
const context = canvas.getContext('2d');
const gridContext = gridCanvas.getContext('2d');

let stream;
let capturedImages = [];
let selectedLayout = null;
let selectedFilter = 'none'; // Default filter

window.onload = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        loadingMessage.style.display = 'block';
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((cameraStream) => {
                stream = cameraStream;
                videoElement.srcObject = stream;
                captureButton.style.display = 'inline-block';
                loadingMessage.style.display = 'none';
            })
            .catch(() => {
                loadingMessage.style.display = 'none';
                errorMessage.style.display = 'block';
                errorMessage.innerText = 'Error accessing camera. Please check your camera settings.';
            });
    } else {
        errorMessage.style.display = 'block';
        errorMessage.innerText = 'Your browser does not support camera access.';
    }
};

// Layout button click handler
layoutButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        layoutButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        const layout = event.target.dataset.layout.split('x');

        // Assign proper rows and columns
        selectedLayout = {
            rows: parseInt(layout[1]),
            cols: parseInt(layout[0]),
            total: parseInt(layout[0]) * parseInt(layout[1])
        };
    });
});

// Filter button click handler
filterButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        selectedFilter = event.target.dataset.filter; // Get selected filter
        videoElement.style.filter = selectedFilter;  // Apply the filter to the video
    });
});

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

// Capture photo and add it to the array
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
    context.filter = selectedFilter; // Apply selected filter to the captured image
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    context.restore();
}

// Generate the photo grid and add the date below the last photo
function generatePhotoGrid() {
    if (capturedImages.length === selectedLayout.total) {
        const gap = 10;
        const photoWidth = 250;
        const photoHeight = Math.round(photoWidth * (videoElement.videoHeight / videoElement.videoWidth));

        const gridWidth = selectedLayout.cols * (photoWidth + gap) + 10;
        const gridHeight = selectedLayout.rows * (photoHeight + gap) + 50; // Increased grid height for space

        gridCanvas.width = gridWidth;
        gridCanvas.height = gridHeight;
        gridContext.fillStyle = "#f1f1f1";
        gridContext.fillRect(0, 0, gridWidth, gridHeight);

        let loadedImages = 0;

        capturedImages.forEach((imgSrc, index) => {
            let row = index % selectedLayout.rows; // Adjusted row positioning
            let col = Math.floor(index / selectedLayout.rows); // Adjusted column positioning

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
                    // Format date as MM/DD/YY
                    const currentDate = new Date();
                    const dateString = currentDate.toLocaleDateString('en-US', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit'
                    });

                    // Set the font and color for the date
                    gridContext.fillStyle = "black";
                    gridContext.font = "20px Arial";
                    gridContext.textAlign = "center";

                    // Position the date below the last photo in the grid
                    const dateY = gridHeight - 20; // 20px below the grid

                    // Set the photo grid image source
                    gridContext.fillText(dateString, gridWidth / 2, dateY);

                    photoGrid.src = "";
                    setTimeout(() => {
                        // Ensure high resolution image is captured
                        photoGrid.src = gridCanvas.toDataURL('image/jpeg', 0.95);
                        photoGrid.style.display = 'block';
                        downloadButton.style.display = 'inline-block';
                    }, 100);
                }
            };
        });
    }
}

// Create retake buttons for each captured image
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

// Replace the photo with a new one when retake button is clicked
async function replacePhoto(index) {
    await countdown();
    captureImageToCanvas();
    capturedImages[index] = canvas.toDataURL('image/jpeg', 0.95);
    generatePhotoGrid();
}

// Download the final photo grid
document.getElementById('downloadButton').addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = gridCanvas.toDataURL('image/jpeg', 0.95);
    link.download = 'photo_grid.jpg';
    link.click();
});

// Countdown before capturing the photo
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
