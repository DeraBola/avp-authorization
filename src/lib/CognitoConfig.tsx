// Cognito configuration
export const cognitoAuthConfig = {
  authority: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_b2yU5NNaC",
  client_id: "1hhpd7gfqh7cp6e92n3n7osfhq",
  redirect_uri: "http://localhost:3000",
  response_type: "code",
  scope: "email openid profile",
};
