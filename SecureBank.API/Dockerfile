FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["SecureBank.API/SecureBank.API.csproj", "SecureBank.API/"]
RUN dotnet restore "SecureBank.API/SecureBank.API.csproj"
COPY . .
WORKDIR "/src/SecureBank.API"
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SecureBank.API.dll"]
