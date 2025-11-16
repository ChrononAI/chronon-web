import mixpanel from "mixpanel-browser";

// Create an instance of the Mixpanel object, your token is already added to this snippet
mixpanel.init('1c1b448258acf56d0ce6c8c7404da5a6', {
  record_sessions_percent: 0,
  autotrack: false,
  track_pageview: false, 
});

mixpanel.disable([
  "autotrack",
  "pageview",
  "form_submit",
]);

export default mixpanel;