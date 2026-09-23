chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-reader' });
    } catch (e) {
      console.warn('Failed to send toggle message to tab:', e);
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reader') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle-reader' });
      } catch (e) {
        console.warn('Failed to send command to tab:', e);
      }
    }
  }
});
