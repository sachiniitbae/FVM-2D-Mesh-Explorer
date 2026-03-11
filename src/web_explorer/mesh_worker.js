// mesh_worker.js - Background thread for mesh parsing
importScripts('parser.js');

self.onmessage = async function(e) {
    const { content } = e.data;
    const parser = new MshParser();

    try {
        const mesh = await parser.parse(content, (message, percent) => {
            // Forward progress updates back to the main thread
            self.postMessage({
                type: 'progress',
                message: message,
                percent: percent
            });
        });

        // Send finalized mesh data back
        self.postMessage({
            type: 'done',
            mesh: mesh
        });
    } catch (err) {
        self.postMessage({
            type: 'error',
            error: err.message
        });
    }
};
