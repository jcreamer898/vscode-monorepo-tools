# monorepo-tools

Monorepo Tools is a VSCode extension that gives developers insight into their monorepo codebase.

## Features

- Works with Yarn workspaces, Rush, Lerna, and PNPM via [worksspace-tools](https://github.com/microsoft/workspace-tools/)
- Working example from [babel](https://github.com/babel/babel)

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/07d29c96-d21d-4d8b-a43c-f72536ffa113)


- Dependency Tree view

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/f01c6619-cffc-4776-a11e-4ae6f1b7975b)


- Status bar of monorepo name and number of packages

![Screenshot on 2021-03-25 at 12-09-11](https://user-images.githubusercontent.com/472487/112514089-f31ce280-8d62-11eb-8e85-fe20e8683bef.png)

- Supports running scripts

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/1c99a958-1a6e-49e0-a59b-a836d050f2df)

- Add a new package will run a `"generate"` script from your root `package.json`.

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/44675980-a8f7-4b60-ac08-7b3563ed2df6)

- Go to monorepo packages

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/95252c36-3500-4c7d-bb85-53e36e27db40)

- Add dependencies to a package

![Screen Capture on 2021-03-26 at 11-51-22](https://user-images.githubusercontent.com/472487/112666145-db5c6180-8e29-11eb-8950-87b1ba4a9c2a.gif)

- See changed packages in your working directory

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/4a4f7346-2542-4e51-ac4e-9e095d73048b)

- Support for Beachball, checking for change files

![image](https://github.com/jcreamer898/vscode-monorepo-tools/assets/472487/72c4c5fa-7dbb-4505-b533-9acfb0769491)

## Configuration

There's a couple of custom configurations you can add in your workspace or user configuration.

![Markup on 2021-03-26 at 11:43:00](https://user-images.githubusercontent.com/472487/112665097-b0254280-8e28-11eb-9932-5b2d3e38202b.png)

The `packageJsonTemplate` allows you to define a custom `package.json` handlebars template file for the add package flow, you'll be given a `name` and `description` from the VSCode UI.
