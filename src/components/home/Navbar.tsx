import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function Navbar({ scrollY }: { scrollY: number }) {
    const navigator = useNavigate();

    return (
        <motion.nav
            initial={{ filter: 'blur(10px)' }}
            animate={{ filter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            className={cn(
                'fixed z-20 flex items-center justify-between py-6 md:p-6 transition-all duration-300 w-full',
                scrollY > 50
                    ? 'backdrop-blur-lg bg-gray-950/70 shadow-lg shadow-black/10'
                    : 'bg-transparent'
            )}
        >
            <div className="w-full flex items-center justify-between md:px-8 px-3 left-0 right-0">
                <div
                    onClick={() => navigator('/')}
                    className="flex items-center space-x-1 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigator('/');
                    }}
                    aria-label="Go to homepage"
                >
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <img
                            src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMkwzIDEzTDEyIDEzTDExIDIyTDIxIDExTDEyIDExTDEzIDJaIiBzdHJva2U9IiM2MEE1RkEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiAvPjwvc3ZnPg=="
                            alt="SnapSite Logo"
                            className="w-6 h-6 relative z-10"
                        />
                    </div>
                    <span className="text-2xl font-bold text-white select-none">SnapSite</span>
                </div>

                <div className="flex gap-5">
                    <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm font-medium whitespace-nowrap">
                        Features
                    </a>
                    <a href="#howitworks" className="text-gray-300 hover:text-white transition-colors text-sm font-medium whitespace-nowrap">
                        How it works
                    </a>
                    <a href="#faq" className="text-gray-300 hover:text-white transition-colors text-sm font-medium whitespace-nowrap">
                        FAQ
                    </a>
                </div>
            </div>
        </motion.nav>
    );
}
