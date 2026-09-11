import { LazyMotion, domAnimation, m as Motion } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <LazyMotion features={domAnimation}>
      <Motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 1.01 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1]
        }}
        className="w-full flex-1 flex flex-col"
      >
        {children}
      </Motion.div>
    </LazyMotion>
  );
};

export default PageTransition;
