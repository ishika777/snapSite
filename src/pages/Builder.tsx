/* eslint-disable @typescript-eslint/no-explicit-any */

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

import { PanelRight, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { WebContainer } from '@webcontainer/api';
import { downloadProjectAsZip } from '../lib/fileDownloader.ts';
import { useAppContext } from '../context/AppContext';
import { Button } from '@/components/ui/button.tsx';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'in-progress' | 'completed';

export function Builder() {


    const defaultPrompt = "Create a Todo App with React and Tailwind CSS";

    const { prompt, setPrompt, setCurrentStep } = useAppContext();

    const [templateSet, setTemplateSet] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const { webcontainer } = useWebContainer();

    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isFileExplorerCollapsed, setFileExplorerCollapsed] = useState(false);

    const [steps, setSteps] = useState<Step[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);

    const API_URL = import.meta.env.VITE_BACKEND_URL;


    useEffect(() => {
        console.log("calling on render")
        let originalFiles = [...files];
        let updateHappened = false;

        steps.filter(({ status }) => status === 'pending').forEach((step) => {
            console.log(step)
            updateHappened = true;
            if (step?.type === StepType.CreateFile) {
                let parsedPath = step.path?.split('/') ?? []; // ["src", "components", "App.tsx"]
                let currentFileStructure = [...originalFiles]; // {}
                const finalAnswerRef = currentFileStructure;

                let currentFolder = '';
                while (parsedPath.length) {
                    currentFolder = `${currentFolder}/${parsedPath[0]}`;
                    const currentFolderName = parsedPath[0];
                    parsedPath = parsedPath.slice(1);

                    if (!parsedPath.length) {
                        // final file
                        const file = currentFileStructure.find(
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
                        const folder = currentFileStructure.find(
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
            console.log("Files updated:", originalFiles);
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
            // console.log('Processing file for mount structure:', file);
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
        console.log('Final mount structure:', mountStructure);
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
    }, [webcontainer, files]);

    const handleFileUpdate = (updatedFile: FileItem) => {

        const updateFilesRecursively = (filesArray: FileItem[], fileToUpdate: FileItem): FileItem[] => {
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
            if (!templateSet) {
                const actualPrompt = prompt?.trim() || defaultPrompt;
                const response = await axios.post(`${API_URL}/template`, {
                    prompt: actualPrompt,
                });

                const { systemPrompt, basicCode } = response.data;

                const initialSteps = parseXml(basicCode[0] || '')
                setSteps(initialSteps);
                setTemplateSet(true);

                const chatResponse = await axios.post(`${API_URL}/chat`, {
                    messages: [...systemPrompt, actualPrompt].map((content: string) => ({
                        role: 'user',
                        content,
                    })),
                });

                const newSteps = parseXml(chatResponse.data.response)
                setSteps((prevSteps) => [...prevSteps, ...newSteps]);
            }

        } catch (error) {
            console.error('Error initializing project:', error);
        }
    }

  

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

    useEffect(() => {
    if (!prompt?.trim()) {
        setPrompt(defaultPrompt);
    }
}, [prompt, setCurrentStep]);

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
                                    <p className="text-sm text-gray-400 line-clamp-2">{prompt}</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4">
                                    <h3 className="text-white font-medium pb-4">Build Steps</h3>
                                    <StepsList
                                        steps={steps}
                                        onStepClick={setCurrentStep}
                                    />
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
                            <div className={`${activeTab === 'code' ? 'block' : 'hidden'} h-full`}>
                                <CodeEditor
                                    file={selectedFile}
                                    onUpdateFile={handleFileUpdate}
                                />
                            </div>

                            <div className={`${activeTab === 'preview' ? 'block' : 'hidden'} h-full`}>
                                {webcontainer && (
                                    <PreviewFrame
                                        webContainer={webcontainer as WebContainer}
                                        files={files}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
