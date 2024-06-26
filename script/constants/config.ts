import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { DeploymentMode } from "@socket.tech/dl-core";
import { Project, ProjectType, Tokens } from "../../src";

export const getSocketOwner = () => {
  if (!process.env.SOCKET_OWNER_ADDRESS)
    throw Error("Socket owner address not present");
  return process.env.SOCKET_OWNER_ADDRESS;
};

export const getSocketSignerKey = () => {
  if (!process.env.SOCKET_SIGNER_KEY)
    throw Error("Socket signer key not present");
  return process.env.SOCKET_SIGNER_KEY;
};

export const getMode = () => {
  if (!process.env.DEPLOYMENT_MODE)
    throw new Error("DeploymentMode not mentioned");
  if (
    !Object.values(DeploymentMode).includes(
      process.env.DEPLOYMENT_MODE as DeploymentMode
    )
  )
    throw new Error("DeploymentMode is invalid");
  return process.env.DEPLOYMENT_MODE as DeploymentMode;
};

export const getProjectName = () => {
  if (!process.env.PROJECT) throw new Error("Project not mentioned");
  if (!Object.values(Project).includes(process.env.PROJECT as Project))
    throw new Error("Project is invalid");
  return process.env.PROJECT as Project;
};

export const getProjectType = () => {
  if (!process.env.PROJECT_TYPE) throw new Error("PROJECT_TYPE not mentioned");
  if (
    !Object.values(ProjectType).includes(
      process.env.PROJECT_TYPE as ProjectType
    )
  )
    throw new Error("project is invalid");
  return process.env.PROJECT_TYPE as ProjectType;
};

export const isSuperBridge = () => getProjectType() === ProjectType.SUPERBRIDGE;
export const isSuperToken = () => getProjectType() === ProjectType.SUPERTOKEN;

export const getTokens = () => {
  if (!process.env.TOKENS) throw new Error("TOKENS not mentioned");
  let tokens = process.env.TOKENS.split(",").map(
    (token) => token.trim() as Tokens
  );
  tokens.forEach((token) => {
    if (!Object.values(Tokens).includes(token as Tokens))
      throw new Error("TOKENS are invalid");
  });
  return tokens;
};

export const getDryRun = () => {
  if (!process.env.DRY_RUN) throw new Error("Dry run not mentioned");
  if (process.env.DRY_RUN !== "true" && process.env.DRY_RUN !== "false")
    throw new Error("Dry run is invalid, must be either 'true' or 'false'");
  return process.env.DRY_RUN === "true";
};

export const getConfigs = () => {
  let projectType = getProjectType();
  let projectName = getProjectName();
  let tokens = getTokens();
  let mode = getMode();
  let socketOwner = getSocketOwner();
  return { projectType, projectName, tokens, mode, socketOwner };
};

export const printConfigs = () => {
  let { projectType, projectName, tokens, mode, socketOwner } = getConfigs();
  console.log("========================================================");
  console.log("MODE", mode);
  console.log("PROJECT", projectName);
  console.log("PROJECT_TYPE", projectType);
  console.log("TOKENS", tokens);
  console.log(
    `Make sure ${mode}_${projectName}_addresses.json and ${mode}_${projectName}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${socketOwner}`);
  console.log("========================================================");
};
