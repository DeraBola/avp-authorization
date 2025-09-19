import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import jwt from "jsonwebtoken";
import { fromEnv } from "@aws-sdk/credential-provider-env";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const decoded: any = jwt.decode(token);
  //  console.log("decoded: ", decoded);

    const cognitoUsername = decoded["cognito:username"];

    const { status, location, time, department } = await req.json();

    // Call Cognito to update attributes
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: cognitoUsername,
        UserAttributes: [
          { Name: "custom:department", Value: department },
          { Name: "custom:Status", Value: status },
          { Name: "custom:Location", Value: location },
          { Name: "custom:Time", Value: time },
        ],
      })
    );

    return NextResponse.json({ message: "Attributes updated successfully" });
  } catch (error) {
    console.error("Error updating user attributes:", error);
    return NextResponse.json(
      { error: "Failed to update attributes" },
      { status: 500 }
    );
  }
}
