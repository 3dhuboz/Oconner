import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const GoogleSignIn = ({ onSuccess, text = 'signin_with' }) => {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          onSuccess(response.credential);
        }
      }
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: '100%',
      text,
      shape: 'rectangular',
      logo_alignment: 'center'
    });
  }, [onSuccess, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div style={{ width: '100%' }}>
      <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center' }}></div>
    </div>
  );
};

export default GoogleSignIn;
