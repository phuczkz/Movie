import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const noMobileTabletHoverPlugin = () => ({
  postcssPlugin: 'no-mobile-tablet-hover',
  AtRule(atRule) {
    if (atRule.name === 'media' && atRule.params.includes('(hover: hover)')) {
      if (!atRule.params.includes('min-width: 1024px')) {
        atRule.params = atRule.params.replace(
          '(hover: hover)',
          '(min-width: 1024px) and (hover: hover)'
        );
      }
    }
  },
});
noMobileTabletHoverPlugin.postcss = true;

export default {
  plugins: [
    tailwindcss(),
    autoprefixer(),
    noMobileTabletHoverPlugin(),
  ],
};

