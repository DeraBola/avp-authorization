// app/api/candidates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  VerifiedPermissionsClient,
  IsAuthorizedCommand,
} from "@aws-sdk/client-verifiedpermissions";

const client = new VerifiedPermissionsClient({ region: "eu-north-1" });

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ Decode JWT to get the user ID (sub)
    interface DecodedToken {
      sub?: string;
      email?: string;
      "cognito:groups"?: string[];
      [key: string]: any;
    }

    const decoded = jwt.decode(token) as DecodedToken;
    if (!decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    console.log("decoded token:", decoded);

    const userId = decoded.sub;

    // 👥 Groups from profile (cognito:groups may be missing if no groups assigned)
    const groups = decoded["cognito:groups"] || [];

    // ✅ Build AVP authorization command with token in context
    const command = new IsAuthorizedCommand({
      policyStoreId: process.env.AVP_STORE_ID!,
      principal: {
        entityType: "JobApp::User",
        entityId: userId,
      },
      action: {
        actionType: "Action",
        actionId: "DeleteCandidate",
      },
      resource: {
        entityType: "JobApp::Candidate",
        entityId: params.id,
      },
      // 👇 context goes here, NOT inside entities
      context: {
        groups: groups,
      } as unknown as any,
    });

    const result = await client.send(command);

    // Forbidden if AVP denies
    if (result.decision !== "ALLOW") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Actual delete (mock example — replace with DB call)
    // e.g., await prisma.candidate.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `Candidate ${params.id} deleted by user ${userId}`,
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
