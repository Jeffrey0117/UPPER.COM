console.log("🧪 開始測試API功能...");

const baseURL = "http://localhost:3000";

// 測試函數
async function testAPI() {
  try {
    console.log("\n1. 測試伺服器連接...");
    const healthResponse = await fetch(`${baseURL}/health`).catch((e) => null);
    if (healthResponse && healthResponse.ok) {
      console.log("✅ 伺服器連接正常");
    } else {
      console.log("❌ 伺服器連接失敗，嘗試根路由...");
      const rootResponse = await fetch(baseURL).catch((e) => null);
      if (rootResponse && rootResponse.ok) {
        console.log("✅ 根路由響應正常");
      } else {
        console.log("❌ 無法連接到伺服器");
        return;
      }
    }

    console.log("\n2. 測試登入API...");
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    let authToken = null;
    console.log("登入響應狀態:", loginResponse.status);

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.accessToken || loginData.token;
      console.log("✅ 登入成功");
    } else {
      console.log("❌ 登入失敗，使用模擬令牌繼續測試...");
      authToken = "test-token";
    }

    console.log("\n3. 測試檔案列表API...");
    const filesResponse = await fetch(`${baseURL}/api/files`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("檔案API響應狀態:", filesResponse.status);

    if (filesResponse.ok) {
      const filesData = await filesResponse.json();
      console.log("✅ 檔案API響應成功");
      console.log("📊 檔案數量:", filesData.files?.length || 0);

      if (filesData.files && filesData.files.length > 0) {
        const firstFile = filesData.files[0];
        console.log("\n📋 檢查storageKey字段:");
        console.log("  - storageKey存在:", !!firstFile.storageKey);
        console.log("  - storageKey值:", firstFile.storageKey || "(空)");

        const allHaveStorageKey = filesData.files.every((f) => f.storageKey);
        if (allHaveStorageKey) {
          console.log("✅ 所有檔案都包含storageKey字段");
        } else {
          console.log("⚠️  部分檔案缺少storageKey字段");
        }
      }
    } else {
      const errorText = await filesResponse.text();
      console.log("❌ 檔案API失敗:", errorText.substring(0, 100));
    }
  } catch (error) {
    console.error("❌ 測試出錯:", error.message);
  }
}

// 立即執行
testAPI()
  .then(() => {
    console.log("\n🎯 測試完成！");
  })
  .catch(console.error);
