import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSun,
    faMoon,
    faLightbulb,
    faBrain
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, ChevronDown, Bot, Zap, Palette, Code, FileText, Image, BarChart3, Copy, RotateCcw, Plus, History, Loader2, Minus, ArrowLeft, Download, Instagram, Linkedin, Twitter, Facebook, InfinityIcon, Atom, Megaphone } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CampaignReviewPanel } from '@/components/campaign/CampaignReviewPanel';
import { CampaignDetailPanel } from '@/components/campaign/CampaignDetailPanel';
import { CampaignStatusBadge } from '@/components/campaign/CampaignStatusBadge';
import { AdsManagerTab } from '@/components/campaign/AdsManagerTab';
import type { Campaign, CreateCampaignPayload } from '@/services/api';
import { Document, ExternalHyperlink, Packer, Paragraph, TextRun } from 'docx';
import { dummyHistory, HistoryEntry, ModelResponse } from '@/utils/dummyHistoryHelper';

// Dynamic JSON structure for Function -> Platform -> Models
const dynamicPlatformModels = {
    "Post Generation": {
        "OpenAI": ["gpt-5-chat", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        "Meta": ["llama-3.2-3b-instruct", "llama3", "meta-llama/Llama-3-8b-chat-hf"],
        "Google": ["gemini-2.5-pro", "gemini-pro-1.5", "gemini-1.0-pro"],
        "Anthropic": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    },
    // "Code Generation": {
    //     "OpenAI": ["gpt-4o", "gpt-4-turbo"],
    //     "Anthropic": ["claude-3-opus", "claude-3-sonnet"],
    //     "Google": ["gemini-1.5-pro"]
    // },
    "Image Generation": {
        "OpenAI": ["dall-e-3", "dall-e-2"],
        "Stability": ["stable-diffusion-xl", "stable-diffusion-v2"]
    },
    "Image Description": {
        "OpenAI": ["gpt-4o", "gpt-4-turbo"],
        "Anthropic": ["claude-3-opus", "claude-3-sonnet"],
        "Google": ["gemini-1.5-pro"]
    },
    // "Sentiment Analysis": {
    //     "OpenAI": ["gpt-4o", "gpt-3.5-turbo"],
    //     "Anthropic": ["claude-3-haiku"],
    //     "Google": ["gemini-1.0-pro"],
    //     "Cohere": ["command-r-plus", "command"]
    // }
};

const functionConfigs = [
    {
        name: "Post Generation",
        apiEndpoint: "/api/text-completion",
        inputs: [
            {
                id: "generate_image",
                label: "Enable Image Generation",
                type: "toggle",
                default: false,
                tooltip: "Generate Image."
            },
            {
                id: "tone",
                label: "Tone",
                type: "select",
                options: ["professional", "witty", "friendly", "casual", "empathetic", "motivational", "neutral", "informational"],
                default: "professional"
            },
            {
                id: "length",
                label: "Length",
                type: "radio-group",
                options: ["short", "medium", "long"],
                default: "short"
            },
            {
                id: "socialMediaPlatforms",
                label: "Social Media Platform",
                type: "multi-select", // <-- changed from multi-select
                options: ["Instagram", "LinkedIn", "Twitter", "Facebook"],
                default: ["Instagram"], // <-- single array
                tooltip: "Select one social media platform."
            }
        ]
    },
    // {
    //     name: "Code Generation",
    //     apiEndpoint: "/api/code-generation",
    //     inputs: [
    //         { id: "language", label: "Language", type: "text", placeholder: "e.g., Python, JavaScript", tooltip: "Specify the programming language for code generation." },
    //         { id: "framework", label: "Framework (Optional)", type: "text", placeholder: "e.g., React, Django", tooltip: "Specify a framework if relevant (e.g., React, Django)." }
    //     ]
    // },
    {
        name: "Image Generation",
        apiEndpoint: "/api/image-generation",
        inputs: [
            { id: "style", label: "Art Style", type: "text", placeholder: "e.g., photorealistic, cartoon", tooltip: "Specify the desired art style for image generation." }
        ]
    },
    {
        name: "Image Description",
        apiEndpoint: "/api/image-description",
        inputs: [
            { id: "imageUpload", label: "Upload Image", type: "file", accept: "image/*", tooltip: "Upload an image for the AI to describe." }
        ]
    },
    // {
    //     name: "Sentiment Analysis",
    //     apiEndpoint: "/api/sentiment-analysis",
    //     inputs: [
    //         { id: "sentimentTarget", label: "Target Entity (Optional)", type: "text", placeholder: "e.g., 'product', 'service'", tooltip: "Specify a specific entity to analyze sentiment for within the text." }
    //     ]
    // }
];

//interface
interface GeneratePayload {
    platforms: Record<string, string[]>;
    input: string;
    options?: Record<string, unknown>;
    history?: unknown[]; // use more specific structure if known
}

interface ModelOutput {
    model: string;
    output: string;
    generated_prompt: string,
    image_url: string;
    social_media_platform: string
}
interface ApiResponse {
    response?: Record<string, ModelOutput[]>;
    error?: string;
}
type PostGenerationInputs = {
    generate_image: boolean;
    tone: "professional" | "witty" | "friendly" | "casual" | "empathetic";
    length: "short" | "medium" | "long";
    socialMediaPlatforms: string;
};
const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
        case 'openai':
            return <Bot className="w-4 h-4 mr-2 text-green-500" />;
        case 'anthropic':
            return <Zap className="w-4 h-4 mr-2 text-orange-500" />;
        case 'meta':
            return <InfinityIcon className="w-4 h-4 mr-2 text-purple-500" />;
        case 'google':
            return <Atom className="w-4 h-4 mr-2 text-blue-500" />;
        case 'stability':
            return <Image className="w-4 h-4 mr-2 text-pink-500" />;
        default:
            return <Bot className="w-4 h-4 mr-2 text-gray-500" />;
    }
};

const getSocialMediaIcon = (platform) => {
    switch (platform.toLowerCase()) {
        case 'instagram':
            return <Instagram className="w-4 h-4 mr-2 text-pink-500" />;
        case 'linkedin':
            return <Linkedin className="w-4 h-4 mr-2 text-blue-600" />;
        case 'twitter':
            return <Twitter className="w-4 h-4 mr-2 text-blue-400" />;
        case 'facebook':
            return <Facebook className="w-4 h-4 mr-2 text-blue-700" />;
        default:
            return <Bot className="w-4 h-4 mr-2 text-gray-500" />;
    }
};

const getFunctionIcon = (functionName) => {
    switch (functionName) {
        case 'Post Generation':
            return <FileText className="w-4 h-4 mr-2" />;
        case 'Code Generation':
            return <Code className="w-4 h-4 mr-2" />;
        case 'Image Generation':
            return <Image className="w-4 h-4 mr-2" />;
        case 'Image Description':
            return <Image className="w-4 h-4 mr-2" />;
        case 'Sentiment Analysis':
            return <BarChart3 className="w-4 h-4 mr-2" />;
        default:
            return <Bot className="w-4 h-4 mr-2" />;
    }
};

const MessageBox = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Allow time for fade-out transition
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    let bgColor = 'bg-blue-500';
    if (type === 'success') bgColor = 'bg-green-500';
    else if (type === 'error') bgColor = 'bg-red-500';
    else if (type === 'warning') bgColor = 'bg-yellow-500';

    return (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${bgColor}`}>
            {message}
        </div>
    );
};

const App = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [theme, setTheme] = useState('light');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedFunction, setSelectedFunction] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [promptText, setPromptText] = useState('');
    const [dynamicInputs, setDynamicInputs] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [outputs, setOutputs] = useState([]);
    const [messageBox, setMessageBox] = useState(null);
    const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
    const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([]);
    const [isNewEntry, setIsNewEntry] = useState(true);
    const [showFormSection, setShowFormSection] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'playground' | 'ads'>('playground');
    // per-card campaign state: keyed by output index
    const [cardCampaigns, setCardCampaigns] = useState<Record<number, Campaign>>({})

    useEffect(() => {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);

        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }

        toast({
            title: `Switched to ${newTheme ? 'dark' : 'light'} mode`,
            description: "Theme preference saved",
        });
    };

    // Get available platforms for selected function
    const getAvailablePlatforms = () => {
        if (!selectedFunction || !dynamicPlatformModels[selectedFunction]) return [];
        return Object.keys(dynamicPlatformModels[selectedFunction]);
    };

    // Get available models for selected platforms and function
    const getAvailableModels = () => {
        if (!selectedFunction || selectedPlatforms.length === 0) return {};
        const modelsByPlatform = {};
        selectedPlatforms.forEach(platform => {
            if (dynamicPlatformModels[selectedFunction]?.[platform]) {
                modelsByPlatform[platform] = dynamicPlatformModels[selectedFunction][platform];
            }
        });
        return modelsByPlatform;
    };

    // --- Effects ---

    // Load theme from localStorage on mount
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            setTheme(storedTheme);
            document.documentElement.classList.add(storedTheme);
        } else {
            document.documentElement.classList.add('light');
        }
    }, []);

    // Update dynamic inputs based on selected function
    useEffect(() => {
        const currentFunctionConfig = functionConfigs.find(func => func.name === selectedFunction);
        const newDynamicInputs: Record<string, string | boolean | null> = {};

        if (currentFunctionConfig && currentFunctionConfig.inputs.length > 0) {
            currentFunctionConfig.inputs.forEach(input => {
                newDynamicInputs[input.id] =
                    dynamicInputs[input.id] ?? (
                        input.type === 'file' ? null :
                            input.type === 'radio-group' ? input.default ?? input.options?.[0] :
                                input.type === 'select' ? input.default ?? '' :
                                    input.type === 'toggle' ? input.default ?? false :
                                        input.default ?? ''
                    );
            });
        }

        setDynamicInputs(newDynamicInputs);
    }, [selectedFunction]);

    // Reset platforms and models when function changes
    useEffect(() => {
        setSelectedPlatforms([]);
        setSelectedModels([]);
    }, [selectedFunction]);

    // Reset models when platforms change
    useEffect(() => {
        setSelectedModels([]);
    }, [selectedPlatforms]);

    // Load search history on mount
    // useEffect(() => {
    //     const loadHistory = () => {
    //         const savedHistory = localStorage.getItem('searchHistory');
    //         if (savedHistory) {
    //             try {
    //                 const parsedHistory = JSON.parse(savedHistory);
    //                 setSearchHistory(parsedHistory);
    //             } catch (error) {
    //                 console.error('Error parsing saved history:', error);
    //                 setSearchHistory(dummyHistory);
    //             }
    //         } else {
    //             setSearchHistory(dummyHistory);
    //         }
    //     };
    //     loadHistory();
    // }, []);

    // --- Handlers ---

    // Theme Toggle Handler
    // const handleThemeToggle = () => {
    //     const newTheme = theme === 'light' ? 'dark' : 'light';
    //     setTheme(newTheme);
    //     document.documentElement.classList.remove(theme);
    //     document.documentElement.classList.add(newTheme);
    //     localStorage.setItem('theme', newTheme);
    // };

    // Toggle Left Panel Handler
    const toggleLeftPanel = () => {
        setIsLeftPanelVisible(!isLeftPanelVisible);
    };

    // Dynamic Input Change Handler
    const handleDynamicInputChange = (e) => {
        const { id, value, type, files } = e.target;
        setDynamicInputs(prev => ({
            ...prev,
            [id]: type === 'file' ? files[0] : value
        }));
    };

    // Show Message Box
    const showMessageBox = useCallback((message, type) => {
        setMessageBox({ message, type });
    }, []);

    // Save to history
    const saveToHistory = useCallback((prompt: string, type: string, response: ModelResponse[]) => {
        const savedHistory = localStorage.getItem('searchHistory');
        let currentHistory: HistoryEntry[] = [];

        if (savedHistory) {
            try {
                currentHistory = JSON.parse(savedHistory);
            } catch (error) {
                console.error('Error parsing saved history:', error);
            }
        }

        // Check for existing entry with same prompt and type
        const existingIndex = currentHistory.findIndex(
            entry => entry.prompt === prompt && entry.type === type
        );

        if (existingIndex !== -1) {
            // Update existing entry
            currentHistory[existingIndex] = {
                ...currentHistory[existingIndex],
                response,
                timestamp: new Date().toISOString()
            };
        } else if (isNewEntry) {
            // Add new entry only if user clicked + New
            const newEntry: HistoryEntry = {
                id: Date.now().toString(),
                prompt,
                type,
                response,
                timestamp: new Date().toISOString()
            };
            currentHistory = [newEntry, ...currentHistory];
        }

        setSearchHistory(currentHistory);
        localStorage.setItem('searchHistory', JSON.stringify(currentHistory));
        setIsNewEntry(false); // Reset after saving
    }, [isNewEntry]);

    // Load history entry
    const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
        setPromptText(entry.prompt);
        if (entry.type) {
            setSelectedFunction(entry.type);
        }
        if (entry.response) {
            setOutputs(entry.response);
        }
        setIsNewEntry(false);
        setShowFormSection(true);
    }, []);

    // Handle New button click
    // const handleNewClick = useCallback(() => {
    //     setPromptText('');
    //     setSelectedFunction('');
    //     setSelectedPlatforms([]);
    //     setSelectedModels([]);
    //     setDynamicInputs({});
    //     setOutputs([]);
    //     setIsNewEntry(true);
    //     setShowFormSection(true);
    // }, []);

    // Export to DOC functionality
    const exportToDoc = useCallback(async () => {
        if (!promptText || !selectedFunction || outputs.length === 0) {
            toast({
                title: "Export Failed",
                description: "No data to export. Please generate content first.",
                variant: "destructive",
            });
            return;
        }
        console.log("outputs", outputs)
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "AI Playground Export",
                                    bold: true,
                                    size: 32,
                                }),
                            ],
                        }),
                        new Paragraph({
                            children: [new TextRun("")],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Function: ",
                                    bold: true,
                                }),
                                new TextRun(selectedFunction),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Prompt: ",
                                    bold: true,
                                }),
                                new TextRun(promptText),
                            ],
                        }),
                        new Paragraph({
                            children: [new TextRun("")],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Generated Outputs:",
                                    bold: true,
                                    size: 24,
                                }),
                            ],
                        }),
                        ...outputs.flatMap((output, index) => {
                            const content = typeof output.content === "string" && output.content.trim()
                                ? output.content
                                : "No content available.";

                            const paragraphs = [
                                new Paragraph({ children: [new TextRun("")] }),
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${index + 1}. ${output.displayName}`,
                                            bold: true,
                                        }),
                                    ],
                                }),
                                new Paragraph({
                                    children: [new TextRun(content)],
                                }),
                            ];

                            // ✅ Conditionally add imageUrl if available
                            if (output.imageUrl && typeof output.imageUrl === "string" && output.imageUrl.trim()) {
                                paragraphs.push(
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: "Image Link: ",
                                                bold: true,
                                            }),
                                            new ExternalHyperlink({
                                                children: [
                                                    new TextRun({
                                                        text: output.imageUrl,
                                                        style: "Hyperlink",
                                                    }),
                                                ],
                                                link: output.imageUrl,
                                            }),
                                        ],
                                    })
                                );
                            }

                            return paragraphs;
                        }),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ai-playground-export-${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            window.URL.revokeObjectURL(url);

            toast({
                title: "Export Successful",
                description: "Document has been downloaded successfully.",
                variant: "success",
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: "Export Failed",
                description: "Failed to export document. Please try again.",
                variant: "destructive",
            });
        }
    }, [promptText, selectedFunction, outputs, toast]);

    // API Dispatcher Function - Updated to call all APIs simultaneously
    const callAIModel = async (
        type: string,
        payload: GeneratePayload,
        imageFile?: File // Add an optional imageFile parameter
    ): Promise<ApiResponse> => {
        const apiConfigs = [
            {
                condition: type.trim().toLowerCase() === "post generation",
                url: "http://127.0.0.1:5000/generate-post",
                name: "Post Generation"
            },
            // Add more API configurations here as they become available
            {
                condition: type.trim().toLowerCase() === "image generation",
                url: "http://127.0.0.1:5000/generate-image-only",
                name: "Image Generation"
            },
            {
                condition: type.trim().toLowerCase() === "image description",
                url: "http://127.0.0.1:5000/generate-image-description",
                name: "Image Description"
            },
        ];

        const validApis = apiConfigs.filter(config => config.condition);

        if (validApis.length === 0) {
            throw new Error(`API not found for selected function: "${type}"`);
        }

        // Execute all valid API calls simultaneously
        const apiCalls = validApis.map(async (config) => {
            try {
                let response;
                if (config.name === "Image Description" && imageFile) {
                    // For image description, use FormData
                    const formData = new FormData();
                    formData.append("image", imageFile); // Append the actual image File here

                    // Create a *new* payload object that does NOT include the image file itself in 'options'
                    const payloadForFormData: GeneratePayload = {
                        platforms: payload.platforms,
                        input: payload.input,
                        options: { ...payload.options }, // Copy options to avoid modifying original
                        history: payload.history,
                    };

                    if (payloadForFormData.options && 'imageUpload' in payloadForFormData.options) {
                        delete payloadForFormData.options.imageUpload; // Ensure image is not nested in payload
                    }

                    formData.append("payload", JSON.stringify(payloadForFormData)); // Stringify the clean payload JSON

                    response = await fetch(config.url, {
                        method: "POST",
                        body: formData, // No Content-Type header needed for FormData; browser sets it.
                    });
                } else {
                    // For other APIs, use application/json
                    response = await fetch(config.url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                }

                const data: ApiResponse = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Unknown error from server");
                }
                return { success: true, data, apiName: config.name };
            } catch (error) {
                console.error(`Error calling ${config.name} API:`, error);
                return { success: false, error: error.message, apiName: config.name };
            }
        });

        // Wait for all API calls to complete
        const results = await Promise.allSettled(apiCalls);

        // Process results - return the first successful response or combine them
        const successfulResults = results
            .filter((result): result is PromiseFulfilledResult<{ success: true, data: ApiResponse, apiName: string }> =>
                result.status === 'fulfilled' && result.value.success)
            .map(result => result.value);

        if (successfulResults.length > 0) {
            return successfulResults[0].data; // Return first successful result
        } else {
            // If all failed, throw error with details
            const errors = results
                .filter((result): result is PromiseFulfilledResult<{ success: false, error: string, apiName: string }> =>
                    result.status === 'fulfilled' && !result.value.success)
                .map(result => result.value.error);
            throw new Error(`All API calls failed: ${errors.join(', ')}`);
        }
    };

    // Copy to Clipboard
    const copyToClipboard = useCallback((text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showMessageBox("Copied to clipboard!", "success");
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showMessageBox("Failed to copy text.", "error");
        }
        document.body.removeChild(textArea);
    }, [showMessageBox]);

    // Simulate API Call (now accepts functionConfig and dynamicInputs)
    const simulateApiCall = useCallback(async (modelInfo, prompt, functionConfig, dynamicInputs) => {
        console.log(`Simulating API call to: ${functionConfig.apiEndpoint}`);
        console.log("Payload (simulated):", {
            model: modelInfo.model,
            prompt: prompt,
            functionInputs: dynamicInputs
        });

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                let generatedText = `Response from ${modelInfo.displayName} for "${prompt}".\n\n`;

                if (functionConfig.name === 'text_completion') {
                    generatedText += `This is a sample Post Generation. The model analyzed your prompt and generated a relevant continuation or answer.`;
                } else if (functionConfig.name === 'code_generation') {
                    const language = dynamicInputs.language || 'Python';
                    const framework = dynamicInputs.framework ? ` (${dynamicInputs.framework})` : '';
                    generatedText += `\`\`\`${language}\n# Sample ${language}${framework} code generated by ${modelInfo.model}\ndef hello_world():\n    print("Hello, AI Playground!")\n\nhello_world()\n\`\`\``;
                } else if (functionConfig.name === 'image_description') {
                    const fileName = dynamicInputs.imageUpload ? dynamicInputs.imageUpload.name : 'no image uploaded';
                    generatedText += `This model would describe the uploaded image (${fileName}), e.g., "A serene landscape with mountains and a clear blue sky." (Image upload functionality is simulated).`;
                } else if (functionConfig.name === 'sentiment_analysis') {
                    const target = dynamicInputs.sentimentTarget;
                    generatedText += `Sentiment: Positive. Confidence: 92%.\n\nAnalysis for ${target ? target : 'the text'}: The model detected a predominantly positive tone in your input.`;
                }

                if (Math.random() < 0.1) { // Simulate occasional errors
                    reject(new Error("API call failed due to a simulated network issue."));
                } else {
                    resolve(generatedText);
                }
            }, 1500 + Math.random() * 1000); // Simulate varying response times
        });
    }, []);

    // Generate Responses Handler
    // const handleGenerate = async () => {
    //     if (!promptText.trim()) {
    //         showMessageBox("Please enter a prompt to generate responses.", "warning");
    //         return;
    //     }

    //     if (!selectedFunction || selectedPlatforms.length === 0 || selectedModels.length === 0) {
    //         showMessageBox("Please select a function, at least one platform, and at least one model.", "warning");
    //         return;
    //     }

    //     const currentFunctionConfig = functionConfigs.find(func => func.name === selectedFunction);

    //     setIsLoading(true);
    //     setOutputs([]); // Clear previous outputs
    //     //send to body in python api
    //     // const body = {
    //     //     function: selectedFunction,            
    //     //     platforms: selectedPlatforms,
    //     //     models: selectedModels,
    //     //     inputs: dynamicInputs,
    //     //     prompt: promptText,
    //     // };
    //     // console.log("Sending request to backend with body:", body);
    //     const allResponses = [];

    //     for (const model of selectedModels) {
    //         const platform = selectedPlatforms.find(p =>
    //             dynamicPlatformModels[selectedFunction]?.[p]?.includes(model)
    //         );

    //         if (platform) {
    //             const modelInfo = {
    //                 platform: platform,
    //                 model: model,
    //                 displayName: `${model} - ${platform}`
    //             };

    //             try {
    //                 const response = await simulateApiCall(modelInfo, promptText, currentFunctionConfig, dynamicInputs);
    //                 allResponses.push({ ...modelInfo, content: response, isError: false });
    //             } catch (error) {
    //                 console.error(`Error generating for ${modelInfo.displayName}:`, error);
    //                 allResponses.push({ ...modelInfo, content: `Error: ${error.message || 'Failed to generate response.'}`, isError: true });
    //             }
    //         }
    //     }

    //     setOutputs(allResponses);
    //     console.log("All response", allResponses)
    //     setIsLoading(false);
    // };
    //Api Handler
    const handleGenerate = async () => {
        if (!promptText.trim()) {
            showMessageBox("Please enter a prompt to generate responses.", "warning");
            return;
        }

        if (!selectedFunction || selectedPlatforms.length === 0 || selectedModels.length === 0) {
            showMessageBox("Please select a function, at least one platform, and at least one model.", "warning");
            return;
        }

        setIsLoading(true);
        setOutputs([]);

        try {
            // Build the platform-models object
            const platformsWithModels = {};
            selectedPlatforms.forEach((platform) => {
                // Get all available models for this platform/function
                const availableModels = dynamicPlatformModels[selectedFunction]?.[platform] || [];

                // Filter selected models that belong to this platform
                const modelsForPlatform = selectedModels.filter(model => availableModels.includes(model));

                if (modelsForPlatform.length > 0) {
                    platformsWithModels[platform.toLowerCase()] = modelsForPlatform;
                }
            });
            // Ensure dynamicInputs correctly holds the file, assuming the file input's ID is 'imageUpload'
            const imageFile = dynamicInputs['imageUpload'] as File | undefined;

            // Construct the payload without the image file nested inside 'options'
            const payload: GeneratePayload = {
                platforms: platformsWithModels,
                input: promptText,
                options: { // Copy other dynamic inputs, but exclude the image file here
                    ...Object.fromEntries(
                        Object.entries(dynamicInputs).filter(([key]) => key !== 'imageUpload')
                    )
                },
                history: [],
            };
            let data: ApiResponse;
            if (selectedFunction.trim().toLowerCase() === "image description" && imageFile) {
                // Pass the imageFile directly as the third argument
                data = await callAIModel(selectedFunction, payload, imageFile);
            } else {
                data = await callAIModel(selectedFunction, payload);
            }
            const transformedOutputs: {
                platform: string; // This will be the LLM platform (e.g., "openai")
                model: string;
                displayName: string;
                content: string;
                imagePrompt?: string;
                imageUrl?: string;
                isError: boolean;
                socialMediaPlatform: string;
            }[] = [];
            //set proper data in layout
            if (data.response && typeof data.response === 'object') {
                Object.entries(data.response).forEach(([llmPlatform, resultsArray]) => {
                    // Ensure resultsArray is actually an array before mapping
                    if (Array.isArray(resultsArray)) {
                        resultsArray.forEach((item) => {
                            transformedOutputs.push({
                                platform: llmPlatform, // e.g., "openai"
                                model: item.model,
                                displayName: `${item.model} - ${llmPlatform} (${item.social_media_platform || 'Generic'})`,
                                content: item.output,
                                imagePrompt: item.generated_prompt, // Will be undefined if not present
                                imageUrl: item.image_url, // Will be undefined if not present
                                isError: false,
                                socialMediaPlatform: item.social_media_platform,
                            });
                        });
                    } else {
                        console.warn(`Unexpected data format for LLM platform ${llmPlatform}: Expected an array, got`, resultsArray);
                    }
                });
            } else {
                console.warn("API response 'response' key is missing or not an object:", data);
            }
            setOutputs(transformedOutputs);
            console.log("setOutputs", transformedOutputs)
            // Save to history after successful API call
            // saveToHistory(promptText, selectedFunction, transformedOutputs);

            // Load the response from localStorage to display
            // const savedHistory = localStorage.getItem('searchHistory');
            // if (savedHistory) {
            //     try {
            //         const parsedHistory = JSON.parse(savedHistory);
            //         const currentEntry = parsedHistory.find(entry =>
            //             entry.prompt === promptText && entry.type === selectedFunction
            //         );
            //         if (currentEntry && currentEntry.response) {
            //             setOutputs(currentEntry.response);
            //         }
            //     } catch (error) {
            //         console.error('Error loading from localStorage:', error);
            //         setOutputs(transformedOutputs);
            //     }
            // } else {
            //     setOutputs(transformedOutputs);
            // }

            toast({
                title: `${selectedFunction} API Success`,
                description: `Response saved successfully for "${selectedFunction}".`,
                variant: "success",
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Unknown error");
            console.error("Error generating:", error);
            toast({
                title: `${selectedFunction} API Failed`,
                description: error.message,
                variant: "destructive",
            });
            // showMessageBox("Failed to generate: " + error.message, "error");
        } finally {
            setIsLoading(false);
            // Auto-close menu on mobile after generation
            if (isMobile && isLeftPanelVisible) {
                setIsLeftPanelVisible(false);
            }
        }
    };


    // Regenerate Single Output Handler
    const handleRegenerate = async (modelInfoToRegenerate, index) => {
        const currentFunctionConfig = functionConfigs.find(func => func.name === selectedFunction);

        // Update the specific output block to show loading state
        setOutputs(prevOutputs =>
            prevOutputs.map((output, i) =>
                i === index ? { ...output, content: 'Generating...', isLoading: true } : output
            )
        );

        try {
            const response = await simulateApiCall(modelInfoToRegenerate, promptText, currentFunctionConfig, dynamicInputs);
            setOutputs(prevOutputs =>
                prevOutputs.map((output, i) =>
                    i === index ? { ...output, content: response, isError: false, isLoading: false } : output
                )
            );
        } catch (error) {
            console.error(`Error regenerating for ${modelInfoToRegenerate.displayName}:`, error);
            setOutputs(prevOutputs =>
                prevOutputs.map((output, i) =>
                    i === index ? { ...output, content: `Error: ${error.message || 'Failed to regenerate response.'}`, isError: true, isLoading: false } : output
                )
            );
        }
    };
    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
                {/* Header */}
                <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleLeftPanel}
                                className="mr-2"
                            >
                                {isLeftPanelVisible ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            </Button>
                            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                                <FontAwesomeIcon icon={faBrain} className="text-primary-foreground text-lg" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">AI Playground</h1>
                                <p className="text-sm text-muted-foreground">Modern AI application</p>
                            </div>
                        </div>

                        {/* Tab switcher */}
                        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setActiveTab('playground')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'playground'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Bot className="w-4 h-4" />
                                <span className="hidden sm:inline">AI Playground</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('ads')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'ads'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Megaphone className="w-4 h-4" />
                                <span className="hidden sm:inline">Ads Manager</span>
                            </button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleTheme}
                            className="transition-all duration-300 hover:shadow-glow"
                        >
                            <FontAwesomeIcon
                                icon={isDarkMode ? faSun : faMoon}
                                className="mr-2"
                            />
                            {isDarkMode ? 'Light' : 'Dark'}
                        </Button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
                {activeTab === 'ads' && (
                    <div className="flex-1 overflow-hidden">
                        <AdsManagerTab />
                    </div>
                )}
                {activeTab === 'playground' && (
                    <>
                    {/* Left Panel: Navigation and Controls */}
                    <div className={`${isLeftPanelVisible ? (isMobile ? 'w-full' : 'w-80') : 'w-0'} transition-all duration-300 overflow-hidden border-r border-border bg-card h-full ${isMobile && isLeftPanelVisible ? 'absolute z-10' : ''}`}>
                        <div className="p-6 h-full flex flex-col overflow-y-auto">
                            {/* + New Button */}
                            {/* <div className="mb-6">
                                {!showFormSection ? (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            handleNewClick();
                                            // any other logic for New
                                        }}
                                        className="w-full"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Chat
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowFormSection(false);
                                            setPromptText('');
                                            setSelectedFunction('');
                                            setSelectedPlatforms([]);
                                            setSelectedModels([]);
                                            setDynamicInputs({});
                                            setOutputs([]);
                                            setIsNewEntry(true);
                                        }}
                                        className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                )}
                            </div> */}

                            {/* Search History */}
                            {/* {!showFormSection && (
                                <div className="flex-1">
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-muted-foreground">Search History</h3>
                                        {searchHistory.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No search history yet.</p>
                                        ) : (
                                            searchHistory.map((entry) => (
                                                <div
                                                    key={entry.id}
                                                    className="p-3 border border-input rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                                                    onClick={() => loadHistoryEntry(entry)}
                                                >
                                                    <p className="text-sm font-medium truncate">{entry.prompt}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {entry.type && <span className="font-medium">{entry.type}</span>}
                                                        {entry.type && <span className="mx-1">•</span>}
                                                        {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )} */}

                            {/* Form Section */}

                            <div className="space-y-6 pt-3 border-border">
                                {/* Function Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Function</label>
                                    <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                                        <SelectTrigger className="w-full">
                                            <div className="flex items-center">
                                                <SelectValue placeholder="Select a function" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {functionConfigs.map(func => (
                                                <SelectItem key={func.name} value={func.name}>
                                                    <div className="flex items-center">
                                                        {getFunctionIcon(func.name)}
                                                        {func.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* AI Platform Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">AI Platforms</label>
                                    <div className="border border-input rounded-md p-3 bg-background min-h-[2.5rem]">
                                        {!selectedFunction ? (
                                            <span className="text-muted-foreground text-sm">Select function first</span>
                                        ) : getAvailablePlatforms().length === 0 ? (
                                            <span className="text-muted-foreground text-sm">No platforms available</span>
                                        ) : (
                                            <div className="space-y-2">
                                                {getAvailablePlatforms().map(platform => (
                                                    <div key={platform} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`platform-${platform}`}
                                                            checked={selectedPlatforms.includes(platform)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedPlatforms([...selectedPlatforms, platform]);
                                                                } else {
                                                                    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                                                                }
                                                            }}
                                                            disabled={!selectedFunction}
                                                        />
                                                        <label
                                                            htmlFor={`platform-${platform}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                                                        >
                                                            {getPlatformIcon(platform)}
                                                            {platform}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Model Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Models</label>
                                    <div className="border border-input rounded-md p-3 bg-background min-h-[2.5rem]">
                                        {selectedPlatforms.length === 0 ? (
                                            <span className="text-muted-foreground text-sm">Select platforms first</span>
                                        ) : (
                                            <div className="space-y-3">
                                                {Object.entries(getAvailableModels()).map(([platform, models]) => (
                                                    <div key={platform} className="space-y-2">
                                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center">
                                                            {getPlatformIcon(platform)}
                                                            {platform}
                                                        </div>
                                                        <div className="space-y-1 ml-6">
                                                            {(models as string[]).map(model => (
                                                                <div key={`${platform}-${model}`} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`model-${platform}-${model}`}
                                                                        checked={selectedModels.includes(model)}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked) {
                                                                                setSelectedModels([...selectedModels, model]);
                                                                            } else {
                                                                                setSelectedModels(selectedModels.filter(m => m !== model));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <label
                                                                        htmlFor={`model-${platform}-${model}`}
                                                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                    >
                                                                        {model}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Input Section */}
                                {selectedFunction && functionConfigs.find(f => f.name === selectedFunction)?.inputs.length > 0 && (
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium">Additional Parameters</label>
                                        {functionConfigs.find(f => f.name === selectedFunction)?.inputs.map(input => (
                                            <div key={input.id} className="space-y-2">
                                                <label htmlFor={input.id} className="text-sm text-muted-foreground">
                                                    {input.label}
                                                </label>
                                                {input.type === 'text' && (
                                                    <input
                                                        type="text"
                                                        id={input.id}
                                                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                                        placeholder={input.placeholder || ''}
                                                        value={dynamicInputs[input.id] || ''}
                                                        onChange={handleDynamicInputChange}
                                                    />
                                                )}
                                                {input.type === 'file' && (
                                                    <input
                                                        type="file"
                                                        id={input.id}
                                                        accept={input.accept || '*'}
                                                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground"
                                                        onChange={handleDynamicInputChange}
                                                    />
                                                )}
                                                {/* Toggle Input */}
                                                {input.type === 'toggle' && (
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="checkbox"
                                                            id={input.id}
                                                            checked={dynamicInputs[input.id] || false}
                                                            onChange={(e) => handleDynamicInputChange({
                                                                target: {
                                                                    id: input.id,
                                                                    value: e.target.checked
                                                                }
                                                            })}
                                                            className="toggle-checkbox h-5 w-10 rounded-full border border-input bg-background transition duration-200 focus:outline-none cursor-pointer"
                                                        />
                                                        <span className="text-xs text-muted-foreground">{input.tooltip}</span>
                                                    </div>
                                                )}
                                                {/* Select Box */}
                                                {input.type === 'select' && (
                                                    <div className="space-y-2">
                                                        {/* <label className="text-sm font-medium">{input.label}</label> */}
                                                        <Select
                                                            value={dynamicInputs[input.id] || ''}
                                                            onValueChange={(value) => handleDynamicInputChange({ target: { id: input.id, value } })}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={`Select ${input.label}`} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {input.options.map(option => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                {/* Length Radio-group */}
                                                {input.type === 'radio-group' && (
                                                    <div className="flex flex-wrap gap-4">
                                                        {input.options.map(option => (
                                                            <label
                                                                key={option}
                                                                className={`px-4 py-2 border rounded-md cursor-pointer text-sm ${dynamicInputs[input.id] === option
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-background text-muted-foreground border-input'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={input.id}
                                                                    value={option}
                                                                    checked={dynamicInputs[input.id] === option}
                                                                    onChange={(e) => handleDynamicInputChange({
                                                                        target: {
                                                                            id: input.id,
                                                                            value: e.target.value
                                                                        }
                                                                    })}
                                                                    className="hidden"
                                                                />
                                                                {option}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* multi-select for Social Media Platforms */}
                                                {input.type === 'multi-select' && input.id === 'socialMediaPlatforms' && (
                                                    <div className="space-y-2 border border-input rounded-md p-3 bg-background min-h-[2.5rem]">
                                                        {input.options.map(option => {
                                                            const selectedValues = dynamicInputs[input.id] || [];

                                                            return (
                                                                <div key={option} className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`${input.id}-${option}`}
                                                                        name={input.id}
                                                                        value={option}
                                                                        checked={selectedValues.includes(option)}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            const newValues = checked
                                                                                ? [...selectedValues, option]
                                                                                : selectedValues.filter((v) => v !== option);

                                                                            handleDynamicInputChange({
                                                                                target: {
                                                                                    id: input.id,
                                                                                    value: newValues
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="form-checkbox text-primary"
                                                                    />
                                                                    <label
                                                                        htmlFor={`${input.id}-${option}`}
                                                                        className="text-sm font-medium leading-none flex items-center cursor-pointer"
                                                                    >
                                                                        {getSocialMediaIcon(option)}
                                                                        {option}
                                                                    </label>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Prompt Text Area */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Prompt</label>
                                    <textarea
                                        rows={4}
                                        className="w-full px-3 py-2 border border-input rounded-md bg-background resize-y"
                                        placeholder="Enter your prompt here..."
                                        value={promptText}
                                        onChange={(e) => setPromptText(e.target.value)}
                                    />
                                </div>

                                {/* Generate Button */}
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isLoading || !selectedFunction || selectedPlatforms.length === 0 || selectedModels.length === 0}
                                    className="w-full"
                                >
                                    {isLoading ? 'Generating...' : 'Generate Response'}
                                    {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>}
                                </Button>

                                {/* Export Button */}
                                {outputs.length > 0 && (
                                    <Button
                                        onClick={exportToDoc}
                                        variant="outline"
                                        className="w-full mt-4"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Export to DOC
                                    </Button>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Right Panel: Model Outputs */}
                    <div className={`flex-1 p-6 h-full overflow-y-auto ${isMobile && isLeftPanelVisible ? 'hidden' : ''}`}>
                        <div className="h-full">
                            {isLoading ? (
                                <Card className="h-full flex items-center justify-center">
                                    <CardContent className="text-center">
                                        <Loader2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-spin" />
                                        <h3 className="text-lg font-semibold mb-2">Generating Response...</h3>
                                        <p className="text-muted-foreground">
                                            Please wait while we process your request.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : outputs.length === 0 ? (
                                <Card className="h-full flex items-center justify-center">
                                    <CardContent className="text-center">
                                        <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                                        <h3 className="text-lg font-semibold mb-2">Welcome to AI Playground!</h3>
                                        <p className="text-muted-foreground">
                                            Select a function, platform, and model on the left, then enter your prompt to see responses here.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                //  <div className={`h-full ${outputs.length > 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto' : 'space-y-4 overflow-y-auto'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                                    {outputs.map((output, index) => (
                                        <Card key={`${output.platform}-${output.model}-${index}`} className={output.isError ? 'border-destructive' : ''}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="flex items-center text-base">
                                                        <span className="flex items-center">
                                                            {getPlatformIcon(output.platform)}
                                                            {output.displayName}
                                                        </span>
                                                    </CardTitle>
                                                    <div className="flex items-center space-x-2">
                                                        {cardCampaigns[index] && (
                                                            <span
                                                                className="cursor-pointer"
                                                                onClick={() => cardCampaigns[index]?.id && setSelectedCampaignId(cardCampaigns[index].id)}
                                                            >
                                                                <CampaignStatusBadge status={cardCampaigns[index].sync_status} />
                                                            </span>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyToClipboard(output.content)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRegenerate(output, index)}
                                                            disabled={output.isLoading}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <RotateCcw className={`w-4 h-4 ${output.isLoading ? 'animate-spin' : ''}`} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="bg-muted p-3 rounded-md max-h-[32rem] overflow-auto space-y-4">
                                                    <pre className="text-sm whitespace-pre-wrap font-mono">
                                                        {output.isError ? (
                                                            <span className="text-destructive">{output.content}</span>
                                                        ) : (
                                                            output.content
                                                        )}
                                                    </pre>

                                                    {/* Image Output (if available) */}
                                                    {output.imageUrl && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={output.imageUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block w-full"
                                                                title="Click to view full image"
                                                            >
                                                                <img
                                                                    src={output.imageUrl}
                                                                    alt="Generated content"
                                                                    className="rounded-md shadow-md hover:opacity-90 transition duration-200 w-full max-h-64 object-contain"
                                                                />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Publish / Schedule panel */}
                                                {!output.isError && (
                                                    <CampaignReviewPanel
                                                        campaignData={{
                                                            name: output.displayName,
                                                            objective: 'OUTCOME_TRAFFIC',
                                                            headline: output.content.split('\n')[0]?.slice(0, 255) ?? '',
                                                            primary_text: output.content.slice(0, 1000),
                                                            image_url: output.imageUrl ?? '',
                                                            target_url: '',
                                                            daily_budget: 2000,
                                                        } satisfies CreateCampaignPayload}
                                                        onPublished={(c) => setCardCampaigns(prev => ({ ...prev, [index]: c }))}
                                                        onScheduled={(c) => setCardCampaigns(prev => ({ ...prev, [index]: c }))}
                                                        onViewDetails={(c) => setSelectedCampaignId(c.id)}
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {messageBox && (
                        <MessageBox
                            message={messageBox.message}
                            type={messageBox.type}
                            onClose={() => setMessageBox(null)}
                        />
                    )}
                    </>
                )}

                </div>
            </div>
            <Toaster />
            <Sonner />

            {/* Campaign detail sheet */}
            <Sheet open={!!selectedCampaignId} onOpenChange={(open) => !open && setSelectedCampaignId(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    {selectedCampaignId && (
                        <CampaignDetailPanel
                            campaignId={selectedCampaignId}
                            onClose={() => setSelectedCampaignId(null)}
                            onDeleted={() => {
                                setSelectedCampaignId(null);
                                setCardCampaigns({});
                            }}
                            onDuplicated={(newCampaign) => {
                                setSelectedCampaignId(newCampaign.id);
                                toast({ title: 'Campaign duplicated', description: newCampaign.name, variant: 'success' });
                            }}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </TooltipProvider>
    );
};

export default App;