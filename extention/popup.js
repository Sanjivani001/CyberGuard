document.getElementById('scan').addEventListener('click', ()=>{
  document.getElementById('status').innerText='Scanning...';
  chrome.runtime.sendMessage({cmd:'scanOpenTabs'}, resp => {
    document.getElementById('status').innerText = resp && resp.ok ? 'Scan started' : 'Scan failed';
  });
});
