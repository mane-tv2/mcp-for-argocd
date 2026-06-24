import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  connectStdioTransport,
  connectHttpTransport,
  connectSSETransport
} from '../server/transport.js';
import { DEFAULT_SSO_PORT } from '../auth/sso.js';

export const cmd = () => {
  const exe = yargs(hideBin(process.argv));

  exe.command(
    'stdio',
    'Start ArgoCD MCP server using stdio.',
    (yargs) => {
      return yargs
        .option('sso', {
          type: 'boolean',
          default: false,
          description:
            'Authenticate via interactive SSO (OAuth2 PKCE), like `argocd login --sso`, instead of a static API token. Requires ARGOCD_BASE_URL.'
        })
        .option('sso-port', {
          type: 'number',
          default: DEFAULT_SSO_PORT,
          description: 'Local port for the OAuth2 callback server used during SSO login.'
        })
        .option('sso-launch-browser', {
          type: 'boolean',
          default: true,
          description:
            'Automatically open the system default browser during SSO login. Use --no-sso-launch-browser to print the URL instead.'
        });
    },
    ({ sso, ssoPort, ssoLaunchBrowser }) =>
      connectStdioTransport({ sso, ssoPort, ssoLaunchBrowser })
  );

  exe.command(
    'sse',
    'Start ArgoCD MCP server using SSE.',
    (yargs) => {
      return yargs.option('port', {
        type: 'number',
        default: 3000
      });
    },
    ({ port }) => connectSSETransport(port)
  );

  exe.command(
    'http',
    'Start ArgoCD MCP server using Http Stream.',
    (yargs) => {
      return yargs
        .option('port', {
          type: 'number',
          default: 3000
        })
        .option('stateless', {
          type: 'boolean',
          default: false,
          description: 'Run in stateless mode'
        });
    },
    ({ port, stateless }) => connectHttpTransport(port, stateless)
  );

  exe.demandCommand().parseAsync();
};
