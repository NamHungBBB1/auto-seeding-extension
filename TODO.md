# TODO for content.js Improvements

- [x] Define helper functions: delay, findPosts, processPost, likePost, commentPost, generateAIComment, closeCommentBox
- [x] Refactor the main loop to use these functions for better readability
- [x] Add improved error handling and logging
- [x] Make stop button stop immediately
- [x] Move caption extraction to after clicking comment button
- [x] Adjust flow: Skip to scroll if action bar not found, skip to close if comment steps fail, use default comment on AI failure, increase delay after sending comment
- [x] Add selection step after highlighting each element
- [x] Fix submit button selector to prevent skipping
- [x] Add checks to ensure each step is completed before proceeding
- [x] Remove waitForElement helper and use direct selectors
- [ ] Test the improved code
