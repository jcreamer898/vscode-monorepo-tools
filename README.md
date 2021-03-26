# monorepo-tools README

Monorepo Tools is a VSCode extension that gives developers insight into their monorepo codebase.

## Features

-   Works with Yarn workspaces, Bolt, Lerna, and PNPM via [Manypkg/get-packages](https://github.com/Thinkmill/manypkg/tree/master/packages/get-packages)
-   Dependency Tree view

![Screen Capture on 2021-03-25 at 13-41-11](https://user-images.githubusercontent.com/472487/112526451-f23e7d80-8d6f-11eb-8669-d5ca553b61c1.gif)

-   Status bar of monorepo name and number of packages

![Screenshot on 2021-03-25 at 12-09-11](https://user-images.githubusercontent.com/472487/112514089-f31ce280-8d62-11eb-8e85-fe20e8683bef.png)

-   Supports running scripts

![Screen Capture on 2021-03-25 at 12-08-12](https://user-images.githubusercontent.com/472487/112514011-e3050300-8d62-11eb-96fb-0666b3644a87.gif)

-   Install dependencies for your workspace tool

![Screen Capture on 2021-03-25 at 12-41-48](https://user-images.githubusercontent.com/472487/112518712-a2f44f00-8d67-11eb-88de-b8fc1c5d21e8.gif)

-   Add a new package

![Screen Capture on 2021-03-26 at 11-50-06](https://user-images.githubusercontent.com/472487/112665856-7dc81500-8e29-11eb-86a1-c21edec0dc00.gif)

- Add dependencies to a package

![Screen Capture on 2021-03-26 at 11-51-22](https://user-images.githubusercontent.com/472487/112666145-db5c6180-8e29-11eb-8950-87b1ba4a9c2a.gif)


## Configuration

There's a couple of custom configurations you can add in your workspace or user configuration.

![Markup on 2021-03-26 at 11:43:00](https://user-images.githubusercontent.com/472487/112665097-b0254280-8e28-11eb-9932-5b2d3e38202b.png)

The `packageJsonTemplate` allows you to define a custom `package.json` handlebars template file for the add package flow, you'll be given a `name` and `description` from the VSCode UI.
