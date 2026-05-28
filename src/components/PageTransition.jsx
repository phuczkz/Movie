// eslint-disable-next-line no-unused-vars
import { LazyMotion, domAnimation, m } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
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
      </m.div>
    </LazyMotion>
  );
};

export default PageTransition;
