import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const headers = (passcode) => ({ "X-Admin-Passcode": passcode });

export const checkPasscode = async (passcode) => {
  const { data } = await axios.post(`${API}/admin/auth/check`, {}, { headers: headers(passcode) });
  return data;
};

export const listFiles = async (passcode) => {
  const { data } = await axios.get(`${API}/admin/files`, { headers: headers(passcode) });
  return data;
};

export const createFile = async (passcode, body) => {
  const { data } = await axios.post(`${API}/admin/files`, body, { headers: headers(passcode) });
  return data;
};

export const markReviewed = async (passcode, fileId) => {
  const { data } = await axios.post(
    `${API}/admin/files/${fileId}/mark-reviewed`,
    {},
    { headers: headers(passcode) },
  );
  return data;
};

export const reopenFile = async (passcode, fileId) => {
  const { data } = await axios.post(
    `${API}/admin/files/${fileId}/reopen`,
    {},
    { headers: headers(passcode) },
  );
  return data;
};
