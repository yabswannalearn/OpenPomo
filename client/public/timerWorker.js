// Timer Web Worker - runs in separate thread, not affected by browser throttling
let timerId = null;
let endTime = null;

self.onmessage = function(e) {
  const data = e.data;
  const type = data.type;
  const payload = data.payload;
  
  switch (type) {
    case 'START':
      endTime = payload.endTime;
      if (timerId) clearInterval(timerId);
      
      // Check immediately
      checkTime();
      
      // Then check every 100ms
      timerId = setInterval(checkTime, 100);
      break;
      
    case 'STOP':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      endTime = null;
      break;
      
    case 'CHECK':
      checkTime();
      break;
  }
};

function checkTime() {
  if (!endTime) return;
  
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
  
  self.postMessage({ type: 'TICK', remaining: remaining });
  
  if (remaining <= 0) {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    self.postMessage({ type: 'COMPLETE' });
    endTime = null;
  }
}
