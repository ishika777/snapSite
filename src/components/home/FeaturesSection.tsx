import { Cpu, Code, Zap, FlaskConical, Layers, Globe } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

export function FeaturesSection() {
    const features = [
        {
            icon: <Cpu className="w-6 h-6" />,
            title: 'AI-Powered Generation',
            description:
                'Describe your website in natural language and watch as SnapSite generates all the code and assets for you.',
        },
        {
            icon: <Code className="w-6 h-6" />,
            title: 'Interactive Editor',
            description:
                'Make precise adjustments with our fully-featured code editor with syntax highlighting and autocompletion.',
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: 'Reprompt and Edit',
            description:
                'Easily reprompt or edit your website to get the perfect design and functionality you desire.',
        },
        {
            icon: <FlaskConical className="w-6 h-6" />,
            title: 'WebContainer Technology',
            description:
                'Run your web applications directly in the browser with our cutting-edge WebContainer technology.',
        },
        {
            icon: <Layers className="w-6 h-6" />,
            title: 'Step-by-Step Guidance',
            description:
                'Follow our intuitive step-by-step process to bring your web application from concept to completion.',
        },
        {
            icon: <Globe className="w-6 h-6" />,
            title: 'Download and Deploy',
            description:
                'Easily download your generated website as a zip file and host it on any platform of your choice.',
        },
    ];

    return (
        <section id="features" className="relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-2xl sm:text-3xl text-center text-white font-medium">
                    Why Choose SnapSite for Creating Website?
                </h2>
                <p className="text-lg text-center mt-4 max-w-lg mx-auto text-gray-400">
                    SnapSite offers a powerful suite of features to make web development and
                    deployment effortless.
                </p>
                <div className="text-center text-3xl text-white font-medium mt-20">
                    <h1>Powerful Features!</h1>
                </div>
                <div className="text-center text-lg text-gray-400 mt-4">
                    <h3>SnapSite is a powerful tool that combines the best of AI and web</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8 text-center px-4 sm:px-0 max-w-7xl mx-auto">
                    {features.map((feature, index) => (
                        <Card
                            key={index}
                            className="width-fit text-left md:ml-7 border border-gray-800 rounded-lg p-4"
                        >
                            <CardHeader className="flex items-center gap-2 p-0 mb-2">
                                <div className="w-fit rounded-lg p-1 text-blue-400">
                                    {feature.icon}
                                </div>
                                <CardTitle className="text-md font-normal text-gray-900 dark:text-gray-100">
                                    {feature.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <CardDescription className="font-regular max-w-sm text-sm text-gray-600 dark:text-gray-400">
                                    {feature.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
