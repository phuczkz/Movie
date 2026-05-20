import { LazyMotion, domAnimation, m as M } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <LazyMotion features={domAnimation}>
      <M.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 1.01 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1]
        }}
        className="w-full h-full"
      >
        {children}
      </M.div>
    </LazyMotion>
  );
};

export default PageTransition;
