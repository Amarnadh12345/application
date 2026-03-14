async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Unexpected response from ${url}: ${text}`);
    }
    if (!response.ok) {
        throw new Error(data.error || JSON.stringify(data));
    }
    return data;
}

async function getJson(url) {
    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${text}`);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error(`Expected JSON from ${url} but got: ${text}`);
    }
}

function renderJson(elementId, data) {
    document.getElementById(elementId).innerText = JSON.stringify(data, null, 2);
}

// Insert handlers
async function handleInsert(url, inputId) {
    const value = document.getElementById(inputId).value;
    if (!value) {
        alert('Please enter data');
        return;
    }

    try {
        const result = await postJson(url, { value });
        alert(result.message || 'Inserted');
        document.getElementById(inputId).value = '';
    } catch (error) {
        console.error('Insert error:', error);
        alert('Error: ' + error.message);
    }
}

document.getElementById('insert1Btn').addEventListener('click', () => {
    handleInsert('/api/insert1', 'insert1Input');
});

document.getElementById('insert2Btn').addEventListener('click', () => {
    handleInsert('/api/insert2', 'insert2Input');
});

// Fetch handlers
async function handleFetch(url, displayId) {
    try {
        const data = await getJson(url);
        renderJson(displayId, data);
    } catch (error) {
        document.getElementById(displayId).innerText = 'Error: ' + error.message;
    }
}

document.getElementById('fetch1Btn').addEventListener('click', () => {
    handleFetch('/api/fetch1', 'fetch1Display');
});

document.getElementById('fetch2Btn').addEventListener('click', () => {
    handleFetch('/api/fetch2', 'fetch2Display');
});

document.getElementById('callBtn').addEventListener('click', async () => {
    try {
        const data = await getJson('/api/call-service1');
        renderJson('result', data);
    } catch (error) {
        document.getElementById('result').innerText = 'Error: ' + error.message;
    }
});