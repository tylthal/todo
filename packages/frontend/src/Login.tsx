import { useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { appService } from './services/AppService';

/**
 * Component used to initiate the Cognito hosted UI sign in flow and
 * process the redirect back to the app.
 */
const Login: React.FC = () => {
  useEffect(() => {
    const handleAuth = async () => {
      try {
        // If the user already returned from Cognito this will resolve
        // with their session and attributes. Otherwise it throws.
        const cognitoUser = await Auth.currentAuthenticatedUser();
        const attrs = (cognitoUser as any).attributes || {};
        appService.setUser({
          id: attrs.sub,
          name: attrs.name || attrs.email || 'User',
        });
      } catch {
        // No session yet so redirect to the hosted UI
        await Auth.federatedSignIn();
      }
    };
    void handleAuth();
  }, []);

  return <p>Redirecting to sign in…</p>;
};

export default Login;
