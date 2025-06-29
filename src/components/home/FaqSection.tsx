import { motion } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqSection() {
    const faqs = [
        {
            question: "How does SnapSite turn my prompts into a website?",
            answer:
                "SnapSite uses advanced AI to interpret your natural language description and generate the necessary code to create a fully functional website. It analyzes your requirements and produces HTML, CSS, and JavaScript files that match your vision.",
        },
        {
            question: "Can I customize the generated website?",
            answer:
                "Absolutely! SnapSite provides a full-featured code editor where you can make precise adjustments to any aspect of your website. The changes are reflected in real-time in the preview window.",
        },
        {
            question: "What kind of websites can I create with SnapSite?",
            answer:
                "SnapSite can help you create a wide range of websites, from simple landing pages to complex web applications with dynamic functionality. It's suitable for portfolios, blogs, e-commerce sites, dashboards, and more.",
        },
        {
            question: "Do I need coding experience to use SnapSite?",
            answer:
                "No coding experience is required. SnapSite is designed to be accessible to everyone, regardless of technical background. However, if you do have coding experience, you can leverage it to make more advanced customizations.",
        },
        {
            question: "How do I deploy my website?",
            answer:
                "SnapSite allows you to download your generated website as a zip file. You can then host it on any web server or platform of your choice, such as GitHub Pages, Netlify, or Vercel.",
        },
    ];

    return (
        <section id="faq" className="py-20 md:py-30 relative z-10">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ filter: "blur(10px)" }}
                        animate={{ filter: "blur(0px)" }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-3xl font-semibold text-white mb-4">FAQ's</h2>
                        <p className="text-lg text-gray-400">
                            Find answers to common questions about SnapSite.
                        </p>
                    </motion.div>
                </div>

                <Accordion type="multiple" className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ filter: "blur(10px)" }}
                            animate={{ filter: "blur(0px)" }}
                            transition={{ duration: 0.3 }}
                        >
                            <AccordionItem
                                value={`item-${index}`}
                                className="border border-gray-800 rounded-lg overflow-hidden"
                            >
                                <AccordionTrigger className="flex w-full cursor-pointer px-6 py-4 bg-gray-900/50 backdrop-blur-sm text-left text-white hover:bg-gray-900/80 no-underline hover:no-underline focus:no-underline">
                                    <span className="text-base font-medium">{faq.question}</span>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 py-4 text-sm bg-gradient-to-br from-gray-800 to-gray-900 text-gray-200 border-t border-gray-700">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        </motion.div>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
