import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Navbar } from '../components/home/Navbar';
import { HeroSection } from '../components/home/HeroSection';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { FaqSection } from '../components/home/FaqSection';
import { Footer } from '../components/home/Footer';
import HowitWork from '@/components/home/Works';

export function Home() {
    const { prompt, setPrompt } = useAppContext();
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrollY]);

    return (
        <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 min-h-screen relative">
            <Navbar scrollY={scrollY} />
            <HeroSection prompt={prompt} setPrompt={setPrompt} />
            <FeaturesSection />
            <HowitWork />
            <FaqSection />
            <Footer />
        </div>
    );
}
