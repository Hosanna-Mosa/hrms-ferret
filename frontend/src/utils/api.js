let accessToken = null;
let refreshSubscribers = [];
let isRefreshing = false;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.map((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

const API_URL = import.meta.env.VITE_API_URL || '';

export const apiRequest = async (url, options = {}) => {
  const finalUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  // Set headers
  const headers = options.headers || {};
  if (accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Ensure JSON requests set content-type
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const finalOptions = {
    ...options,
    headers,
    credentials: options.credentials || 'include' // crucial to send refresh cookie
  };

  try {
    const response = await fetch(finalUrl, finalOptions);

    // If 401 and we aren't already fetching a new token, try to refresh
    if (response.status === 401 && !url.includes('/api/auth/refresh') && !url.includes('/api/auth/login')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshUrl = `${API_URL}/api/auth/refresh`;
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAccessToken(data.token);
            isRefreshing = false;
            onTokenRefreshed(data.token);
          } else {
            isRefreshing = false;
            setAccessToken(null);
            // Trigger logout or event
            window.dispatchEvent(new CustomEvent('auth-session-expired'));
            throw new Error('Session expired');
          }
        } catch (refreshErr) {
          isRefreshing = false;
          setAccessToken(null);
          window.dispatchEvent(new CustomEvent('auth-session-expired'));
          throw refreshErr;
        }
      }

      // Return a promise that resolves when the token is refreshed
      return new Promise((resolve) => {
        addRefreshSubscriber((newToken) => {
          finalOptions.headers['Authorization'] = `Bearer ${newToken}`;
          resolve(fetch(finalUrl, finalOptions));
        });
      });
    }

    return response;
  } catch (error) {
    console.error(`API request error on ${finalUrl}:`, error);
    throw error;
  }
};
