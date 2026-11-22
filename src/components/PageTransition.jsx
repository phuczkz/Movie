// LazyMotion đã được bọc ở root (main.jsx)
import { m as Motion } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.1, 
        ease: "easeOut"
      }}
      className="w-full flex-1 flex flex-col will-change-[opacity]"
    >
      {children}
    </Motion.div>
  );
};

export default PageTransition;
