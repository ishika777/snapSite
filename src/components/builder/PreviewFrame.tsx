import { WebContainer } from '@webcontainer/api';
import { useEffect, useState } from 'react';
import { RefreshCw, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewFrameProps {
    files: any[];
    webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function startDevServer() {
        try {
            setLoading(true);
            setError(null);

            const installProcess = await webContainer.spawn('npm', ['install']);

            const installExitCode = await installProcess.exit;

            if (installExitCode !== 0) {
                setError(`npm install failed with exit code ${installExitCode}`);
                setLoading(false);
                return;
            }

            try {
                await webContainer.spawn('npm', ['run', 'dev', '--', '--host']);
            } catch (err) {
                console.error('Failed to start dev server:', err);
                setError('Failed to start development server');
                setLoading(false);
                return;
            }

            webContainer.on('server-ready', (port, serverUrl) => {
                setUrl(serverUrl);
                setLoading(false);
            });

        } catch (err) {
            console.error('Preview initialization error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';

            if (errorMessage.includes('SharedArrayBuffer') || errorMessage.includes('crossOriginIsolated')) {
                setError(
                    'This browser requires cross-origin isolation for the preview. Try restarting the dev server with "npm run dev" or try another browser.'
                );
            } else {
                setError(`Failed to initialize preview environment: ${errorMessage}`);
            }

            setLoading(false);
        }
    }

    useEffect(() => {
        if (files.length > 0 && webContainer) {
            startDevServer();
        }
    }, [files, webContainer]);

    return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
            {loading && (
                <div className="text-center p-6 flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-gray-300 font-medium">Setting up preview environment...</p>
                    <p className="text-sm text-gray-500">This might take a moment</p>
                </div>
            )}

            {error && (
                <div className="text-center p-6 bg-red-950/20 rounded-lg border border-red-900/50 max-w-md">
                    <AlertOctagon className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="text-red-400 font-medium text-lg mb-2">Preview Error</h3>
                    <p className="text-gray-300 mb-4">{error}</p>
                    <button
                        onClick={startDevServer}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-gray-200 rounded-md transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </button>
                </div>
            )}

            {url && !loading && !error && (
                <iframe
                    src={url}
                    className={cn(
                        "w-full h-full border-0 transition-opacity duration-300 opacity-100"
                    )}
                    title="Site Preview"
                    sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
                />
            )}
        </div>
    );
}
