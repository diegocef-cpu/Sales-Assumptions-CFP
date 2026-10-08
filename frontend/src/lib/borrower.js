import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const fetchBorrowerFile = async (token) => {
  const { data } = await axios.get(`${API}/borrower/${token}`);
  return data;
};

export const saveBorrowerState = async (token, state, businessNameOverride) => {
  const { data } = await axios.put(`${API}/borrower/${token}`, {
    state,
    business_name_override: businessNameOverride || null,
  });
  return data;
};

export const submitBorrower = async (token) => {
  const { data } = await axios.post(`${API}/borrower/${token}/submit`);
  return data;
};
