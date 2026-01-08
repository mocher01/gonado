# Page snapshot

```yaml
- generic [active]:
  - alert [ref=e1]
  - dialog "Server Error" [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e8]:
          - button "previous" [disabled] [ref=e9]:
            - img "previous" [ref=e10]
          - button "next" [disabled] [ref=e12]:
            - img "next" [ref=e13]
          - generic [ref=e15]: 1 of 1 error
        - heading "Server Error" [level=1] [ref=e16]
        - paragraph [ref=e17]: "Error: Could not find the module \"/app/node_modules/next/dist/client/components/app-router.js#\" in the React Client Manifest. This is probably a bug in the React Server Components bundler."
        - generic [ref=e18]: This error happened while generating the page. Any console logs will be displayed in the terminal window.
      - generic [ref=e19]:
        - heading "Call Stack" [level=2] [ref=e20]
        - group [ref=e21]:
          - generic "Next.js" [ref=e22] [cursor=pointer]:
            - img [ref=e23]
            - img [ref=e25]
            - text: Next.js
```