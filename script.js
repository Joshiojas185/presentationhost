
// const socket = io('http://10.33.0.21:5000');
const socket = io('https://presentationbackend.onrender.com/')

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const nameInput = document.getElementById('name-input');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const playerList = document.getElementById('player-list');
const pdfRoom = document.getElementById('pdf-room');
const pdfCanvas = document.getElementById('pdfCanvas');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const thumbnailList = document.getElementById('thumbnail-list');


let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let myName = '';
let myRoom = '';
let isHost = false;

function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const regex = /([^&=]+)=([^&]*)/g;
    let m;

    while (m = regex.exec(queryString)) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    return params;
}

window.onload = () => {
    const params = getQueryParams();
    if (params.room) {
        const playerName = params.name;
        roomInput.value = params.room;
        nameInput.value = playerName;

        // Delay the join event to ensure the socket connection is established
        setTimeout(() => {
            joinBtn.click(); // Simulate click to join the room
        }, 100); // Adjust the delay as needed (100ms is a good starting point)
    }   
};


function joinLive(roomName, playerName) {
    // Set the room and player name in the input fields
    document.getElementById('room-input').value = roomName;
    document.getElementById('name-input').value = playerName;

    // Simulate a click on the join button
    setTimeout(() => {
        joinBtn.click(); // Simulate click to join the room
    }, 100); 
    // document.getElementById('join-btn').click();
}


// Function to toggle full screen
function toggleFullScreen() {
    const canvas = pdfCanvas;
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Add event listener to the PDF canvas
pdfCanvas.addEventListener('click', toggleFullScreen);

joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const roomName = roomInput.value.trim();
    if (name && roomName) {
        myName = name;
        myRoom = roomName;
        socket.emit('joinRoom', roomName, name);
        nameInput.style.display = 'none';
        roomInput.style.display = 'none';
        joinBtn.style.display = 'none';
    }
});

socket.on('updatePlayers', (players) => {
    playerList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.innerText = player.name;
        playerList.appendChild(li);
    });
});

socket.on('hostAssigned', () => {
    isHost = true; // Set the host flag
    document.getElementById('thumbnail-container').style.display = 'flex'; 
});

nextBtn.addEventListener('click', () => { // emit next btn event 
    socket.emit('nextPage', myRoom);
});

prevBtn.addEventListener('click', () => { // emit prev btn event
    socket.emit('prevPage', myRoom);
});

socket.on('pdfUploaded', (pdfPath) => {
    document.getElementById('waiting-room').style.display = 'none';
    pdfRoom.style.display = 'block'; // Show the PDF room
    loadPDF(pdfPath);
});

function loadPDF(pdfPath) {
    
    // const fullPath = `http://10.33.0.21:5000${pdfPath}`;
    const fullPath = `https://presentationbackend.onrender.com${pdfPath}`;
    // const fullPath = `http://192.168.29.153:5000${pdfPath}`; // Use the correct server URL
    pdfjsLib.getDocument(fullPath).promise.then(pdf => {
        pdfDoc = pdf;
        totalPages = pdf.numPages;
        renderPage(currentPage);
        generateThumbnails();
    }).catch(error => {
        console.error("Error loading PDF:", error);
        alert("Failed to load PDF. Please check the console for more details.");
    });
}

function renderPage(num) {
    pdfDoc.getPage(num).then(page => {
        const canvas = pdfCanvas;
        const context = canvas.getContext("2d");
        const scale = 2.0; // Adjust scale as needed
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = { canvasContext: context, viewport: viewport };
        page.render(renderContext).promise.then(() => {
            console.log(`Rendered page ${num}`);
        }).catch(error => {
            console.error("Error rendering page:", error);
        });
    }).catch(error => {
        console.error("Error getting page:", error);
    });
}

function generateThumbnails() {
    thumbnailList.innerHTML = ''; // Clear existing thumbnails
    let clickLock = false; // Lock to prevent multiple clicks

    for (let i = 1; i <= totalPages; i++) {
        pdfDoc.getPage(i).then(page => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext("2d");
            const scale = 0.3; // Thumbnail scale
            const viewport = page.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.classList.add('thumbnail');

            // Render the page to the thumbnail canvas
            page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                // Set up the click event for the thumbnail with a lock
                canvas.addEventListener('click', () => {
                    if (clickLock) return; // Ignore clicks if lock is active
                    clickLock = true; // Lock further clicks
                    const selectedPage = i; // Page numbers start from 1
                    socket.emit('goToPage', myRoom, selectedPage); // Emit the page change event

                    setTimeout(() => {
                        clickLock = false; // Unlock clicks after 500ms
                    }, 500);
                });

                thumbnailList.appendChild(canvas); // Append the thumbnail to the list
            });
        });
    }
}



socket.on('pageChanged', (pageNumber) => {
    currentPage = pageNumber;
    renderPage(pageNumber); // This should update the PDF view to the selected page
});

function redirectToUpload() {
    window.location.href = "upload.html";
}