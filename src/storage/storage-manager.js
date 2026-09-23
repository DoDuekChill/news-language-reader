export class StorageManager {
  static async saveSession(session) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const key = `session_${session.sessionId}`;
      await chrome.storage.local.set({ [key]: session });

      // Append to index list
      const data = await chrome.storage.local.get('session_index');
      const list = data.session_index || [];
      const updatedList = [{
        id: session.sessionId,
        title: session.meta.title,
        url: session.meta.url,
        createdAt: session.meta.createdAt,
        wordCount: session.words.length
      }, ...list.filter(item => item.id !== session.sessionId)];

      await chrome.storage.local.set({ session_index: updatedList });
    }
  }

  static async getSession(sessionId) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(`session_${sessionId}`);
      return data[`session_${sessionId}`] || null;
    }
    return null;
  }

  static async listSessions() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get('session_index');
      return data.session_index || [];
    }
    return [];
  }
}
