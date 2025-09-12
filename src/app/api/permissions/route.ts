import { NextRequest, NextResponse } from "next/server";
import {
  VerifiedPermissionsClient,
  BatchIsAuthorizedCommand,
} from "@aws-sdk/client-verifiedpermissions";
import jwt from "jsonwebtoken";
import { ACTIONS } from "@/lib/Permissions";
import { fromEnv } from "@aws-sdk/credential-provider-env";

const client = new VerifiedPermissionsClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export async function GET(req: NextRequest) {
  try {
    // ✅ 1. Get the user’s Cognito token
   const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

        // ✅ Decode JWT to get the user ID (sub)
        interface DecodedToken {
          sub?: string;
          email?: string;
          "cognito:groups"?: string | string[];
          [key: string]: any;
        }
    
        const decoded = jwt.decode(token) as DecodedToken;
        if (!decoded?.sub) {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.log("decoded token:", decoded);

    // ✅ 2. Build AVP batch requests for all actions
    const authRequests = ACTIONS.map((actionId) => ({
      principal: {
        entityType: "JobApp::User",
        entityId: decoded.sub,
      },
      action: {
        actionType: "Action",
        actionId,
      },
      resource: {
        entityType: "JobApp::Candidate",
        entityId: "*",
      },
    }));

    // ✅ 3. Send single BatchIsAuthorized request
    const command = new BatchIsAuthorizedCommand({
      policyStoreId: process.env.AVP_STORE_ID!,
      requests: authRequests,
    });

    const res = await client.send(command);

    // ✅ 4. Filter only allowed actions
    const allowed = res.results
      ?.filter((r) => r.decision === "ALLOW")
      .map((r) => r.request?.action?.actionId);

    return NextResponse.json({ permissions: allowed ?? [] });
  } catch (err) {
    console.error("Error fetching permissions:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
