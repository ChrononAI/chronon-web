import mixpanel from "mixpanel-browser";

export const initMixpanel = () => {
  mixpanel.init("1c1b448258acf56d0ce6c8c7404da5a6", {
    record_sessions_percent: 0,
    autotrack: false,
    track_pageview: false,
  });

  mixpanel.disable(["$autotrack", "$pageview", "form_submit"]);
};

export const trackEvent = (eventName: string, props = {}) => {
  mixpanel.track(eventName, props);
};

export const identifyUser = (userId: string) => {
  if (userId) mixpanel.identify(userId);
};

export const setUserProfile = (profile = {}) => {
  mixpanel.people.set(profile);
};

export default mixpanel;
