import { motion as Motion } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 1.01 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.4, 0, 0.2, 1] // Standard Material-like easing or custom
      }}
      className="w-full h-full"
    >
      {children}
    </Motion.div>
  );
};

export default PageTransition;
