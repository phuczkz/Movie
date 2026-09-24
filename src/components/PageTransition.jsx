// LazyMotion đã được bọc ở root (main.jsx) — không cần bọc lại ở đây
import { m as Motion } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ 
        duration: 0.15, 
        ease: "easeOut"
      }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </Motion.div>
  );
};

export default PageTransition;
