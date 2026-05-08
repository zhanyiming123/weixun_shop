export default (config: { mock?: boolean; setup: () => void }) => {
  const { mock = import.meta.env.VITE_ENABLE_MOCK !== 'false', setup } = config;
  if (mock === false) return;
  setup();
};
