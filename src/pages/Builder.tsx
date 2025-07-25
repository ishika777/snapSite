import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StepsList } from '../components/builder/StepsList.tsx';
import { FileExplorer } from '../components/builder/FileExplorer';
import { TabView } from '../components/builder/TabView.tsx';
import { CodeEditor } from '../components/builder/CodeEditor.tsx';
import { PreviewFrame } from '../components/builder/PreviewFrame';
import { Step, FileItem, StepType } from '@/types/index.ts';
import axios from 'axios';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader.tsx';

import { PanelRight, Send, RefreshCw, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { WebContainer } from '@webcontainer/api';
import { downloadProjectAsZip } from '../utils/fileDownloader';
import { useAppContext } from '../context/AppContext';
import { Button } from '@/components/ui/button.tsx';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'in-progress' | 'completed';

export function Builder() {

    const { prompt, currentStep, setCurrentStep, } = useAppContext();

    const [userPrompt, setPrompt] = useState('');
    const [llmMessages, setLlmMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [templateSet, setTemplateSet] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const { webcontainer, error: webContainerError, loading: webContainerLoading, } = useWebContainer();

    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isFileExplorerCollapsed, setFileExplorerCollapsed] = useState(false);

    const [steps, setSteps] = useState<Step[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);

    const API_URL = import.meta.env.VITE_BACKEND_URL;


    useEffect(() => {
        let originalFiles = [...files];
        let updateHappened = false;

        steps.filter(({ status }) => status === 'pending').forEach((step) => {
            console.log(step)
            updateHappened = true;
            if (step?.type === StepType.CreateFile) {
                let parsedPath = step.path?.split('/') ?? []; // ["src", "components", "App.tsx"]
                let currentFileStructure = [...originalFiles]; // {}
                let finalAnswerRef = currentFileStructure;

                let currentFolder = '';
                while (parsedPath.length) {
                    currentFolder = `${currentFolder}/${parsedPath[0]}`;
                    let currentFolderName = parsedPath[0];
                    parsedPath = parsedPath.slice(1);

                    if (!parsedPath.length) {
                        // final file
                        let file = currentFileStructure.find(
                            (x) => x.path === currentFolder
                        );
                        if (!file) {
                            currentFileStructure.push({
                                name: currentFolderName,
                                type: 'file',
                                path: currentFolder,
                                content: step.code,
                            });
                        } else {
                            file.content = step.code;
                        }
                    } else {
                        /// in a folder
                        let folder = currentFileStructure.find(
                            (x) => x.path === currentFolder
                        );
                        if (!folder) {
                            // create the folder
                            currentFileStructure.push({
                                name: currentFolderName,
                                type: 'folder',
                                path: currentFolder,
                                children: [],
                            });
                        }

                        currentFileStructure = currentFileStructure.find(
                            (x) => x.path === currentFolder
                        )!.children!;
                    }
                }
                originalFiles = finalAnswerRef;
            }
        });

        if (updateHappened) {
            setFiles(originalFiles);
            setSteps((steps) =>
                steps.map((s: Step) => {
                    return {
                        ...s,
                        status: 'completed' as StepStatus,
                    };
                })
            );
        }
    }, [steps]);

    const createMountStructure = (files: FileItem[]): Record<string, any> => {
        const mountStructure: Record<string, any> = {};

        const processFile = (file: FileItem, isRootFolder: boolean) => {
            if (file.type === 'folder') {
                mountStructure[file.name] = {
                    directory: file.children
                        ? Object.fromEntries(
                            file.children.map((child) => [
                                child.name,
                                processFile(child, false),
                            ])
                        )
                        : {},
                };
            } else if (file.type === 'file') {
                if (isRootFolder) {
                    mountStructure[file.name] = {
                        file: {
                            contents: file.content || '',
                        },
                    };
                } else {
                    return {
                        file: {
                            contents: file.content || '',
                        },
                    };
                }
            }

            return mountStructure[file.name];
        };

        files.forEach((file) => processFile(file, true));
        return mountStructure;
    };

    useEffect(() => {
        if (!webcontainer || files.length === 0) return;

        try {
            (webcontainer as WebContainer).mount(createMountStructure(files));
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'message' in err) {
                toast.error('Error mounting files to WebContainer: ' + (err as { message: string }).message);
            } else {
                toast.error('Error mounting files to WebContainer: Unknown error');
            }
        }
    }, [files, webcontainer]);

    const handleFileUpdate = (updatedFile: FileItem) => {

        const updateFilesRecursively = (
            filesArray: FileItem[],
            fileToUpdate: FileItem
        ): FileItem[] => {
            return filesArray.map((file) => {
                if (file.path === fileToUpdate.path) {
                    return fileToUpdate;
                } else if (file.type === 'folder' && file.children) {
                    return {
                        ...file,
                        children: updateFilesRecursively(file.children, fileToUpdate),
                    };
                }
                return file;
            });
        };

        const updatedFiles = updateFilesRecursively(files, updatedFile);
        setFiles(updatedFiles);

        // Update file in WebContainer if it's initialized
        if (webcontainer) {
            try {
                (webcontainer as WebContainer).fs.writeFile(
                    updatedFile.path.startsWith('/')
                        ? updatedFile.path.substring(1)
                        : updatedFile.path,
                    updatedFile.content || ''
                );
            } catch (err) {
                console.error('Error writing file to WebContainer:', err);
            }
        }
    };

    async function init() {
        try {
            setLoading(true);

            if (!templateSet) {
                const response = await axios.post(`${API_URL}/template`, {
                    prompt,
                });

                const { prompts, uiPrompts } = response.data;

                setLlmMessages([
                    {
                        role: 'user',
                        content: prompt,
                    },
                ]);

                const initialSteps = parseXml(uiPrompts[0] || '')
                setSteps(initialSteps);
                setTemplateSet(true);

                // Send the chat request for full project generation
                const chatResponse = await axios.post(`${API_URL}/chat`, {
                    messages: [...prompts, prompt].map((content: string) => ({
                        role: 'user',
                        content,
                    })),
                });

                const newSteps = parseXml(chatResponse.data.response)
                setSteps((prevSteps) => [...prevSteps, ...newSteps]);

                setLlmMessages((prevMessages) => [
                    ...prevMessages,
                    { role: 'assistant', content: chatResponse.data.response },
                ]);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error initializing project:', error);
            setLoading(false);
        }
    }

    const handleRefreshWebContainer = () => {
        window.location.href = '/';
    };

    const handleDownloadProject = async () => {
        if (files.length > 0) {
            setIsDownloading(true);
            try {
                await downloadProjectAsZip(files);
            } catch (error) {
                console.error('Failed to download project:', error);
            } finally {
                setIsDownloading(false);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!userPrompt.trim()) return;

        const newUserMessage = {
            role: 'user' as const,
            content: userPrompt,
        };

        setLlmMessages([...llmMessages, newUserMessage]);
        setPrompt('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/chat`, {
                messages: [...llmMessages, newUserMessage],
            });

            const assistantMessage = {
                role: 'assistant' as const,
                content: response.data.response,
            };

            setLlmMessages([...llmMessages, newUserMessage, assistantMessage]);

            const newSteps = parseXml(response.data.response)
            if (newSteps.length > 0) {
                setSteps((prevSteps) => [...prevSteps, ...newSteps]);
            }

        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (webcontainer && !templateSet) {
            init();
        }
    }, [webcontainer, templateSet]);

    return (
        <div className="max-h-screen h-screen overflow-auto bg-gray-950 flex flex-col">
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-2 flex items-center justify-between">
                <Link to={"/"}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <img
                        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMkwzIDEzTDEyIDEzTDExIDIyTDIxIDExTDEyIDExTDEzIDJaIiBzdHJva2U9IiM2MEE1RkEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiAvPjwvc3ZnPg=="
                        alt="SnapSite Logo"
                        className="w-6 h-6 relative z-10"
                    />
                    <h1 className="text-xl font-semibold text-white">SnapSite</h1>
                </Link>
                <Button
                    onClick={handleDownloadProject}
                    disabled={isDownloading || files.length === 0}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mr-4 bg-gray-800 px-3 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download project as ZIP"
                >
                    {isDownloading ? (
                        <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            <span className="hidden sm:inline">Downloading...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download ZIP</span>
                        </>
                    )}
                </Button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <motion.div
                    className="bg-gray-900 border-r border-gray-800 overflow-hidden"
                    animate={{
                        width: isSidebarCollapsed
                            ? '0'
                            : ['100%', '90%', '75%', '50%', '33%', '25rem'].length >
                                window.innerWidth / 100
                                ? '0'
                                : '25rem',
                    }}
                    initial={false}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex h-full">
                        {!isSidebarCollapsed && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="border-b border-gray-800 p-3">
                                    <p className="text-sm text-gray-400 line-clamp-2">{prompt.length == 0 ? <span className='text-white'>Your Prompt</span> : prompt}</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4">
                                    <h3 className="text-white font-medium pb-4">Build Steps</h3>
                                    <StepsList
                                        steps={steps}
                                        currentStep={currentStep}
                                        onStepClick={setCurrentStep}
                                    />
                                </div>

                                <div className="border-t border-gray-800 p-1">
                                    {loading || !templateSet ? (
                                        <Loader />
                                    ) : (
                                        <div className="relative">
                                            <textarea
                                                value={userPrompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="Add more instructions or modifications..."
                                                className="w-full p-3 bg-gray-800 text-gray-200 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder-gray-500 text-sm h-20"
                                            ></textarea>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={userPrompt.trim().length === 0}
                                                className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-full transition-colors"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className="border-r border-gray-800 bg-gray-900 overflow-hidden flex flex-col"
                    animate={{
                        width: isFileExplorerCollapsed ? '0' : '16rem',
                        opacity: isFileExplorerCollapsed ? 0 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="p-2 pl-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-white font-medium">Files</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <FileExplorer files={files} onFileSelect={setSelectedFile} />
                    </div>
                </motion.div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900 ">
                        <TabView activeTab={activeTab} onTabChange={setActiveTab} />
                        <div className="flex items-center">
                            <button
                                onClick={() =>
                                    setFileExplorerCollapsed(!isFileExplorerCollapsed)
                                }
                                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                                title={isFileExplorerCollapsed ? 'Show files' : 'Hide files'}
                            >
                                <PanelRight
                                    className={`w-4 h-4 text-gray-400 ${isFileExplorerCollapsed ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            <button
                                onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                                className="ml-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                                title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                            >
                                <PanelRight
                                    className={`w-4 h-4 text-gray-400 ${!isSidebarCollapsed ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden p-4 bg-gray-950">
                        <div className="h-full rounded-lg overflow-hidden border border-gray-800 bg-gray-900 shadow-xl">
                            {activeTab === 'code' ? (
                                <CodeEditor
                                    file={selectedFile}
                                    onUpdateFile={handleFileUpdate}
                                />
                            ) : webcontainer ? (
                                <PreviewFrame
                                    webContainer={webcontainer as WebContainer}
                                    files={files}
                                />
                            ) : webContainerLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
                                    <div>
                                        <Loader size="lg" className="mb-4" />
                                        <h3 className="text-lg font-medium text-gray-300 mb-2">
                                            Initializing WebContainer
                                        </h3>
                                        <p className="text-gray-500 max-w-md">
                                            Setting up the preview environment. This might take a
                                            moment...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
                                    <div>
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-300 mb-2">
                                            WebContainer Error
                                        </h3>
                                        <p className="text-gray-400 max-w-md mb-6">
                                            {webContainerError?.message ||
                                                'The WebContainer environment could not be initialized. This may be due to missing browser security headers or lack of browser support.'}
                                        </p>
                                        <button
                                            onClick={handleRefreshWebContainer}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
