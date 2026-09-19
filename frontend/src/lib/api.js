import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const suggestCatalog = async ({ industry, businessModel, description, months }) => {
  const { data } = await axios.post(`${API}/ai/suggest-catalog`, {
    industry,
    business_model: businessModel,
    description,
    months,
  });
  return data;
};

export const suggestAssumptions = async ({ industry, businessModel, itemName, months, price }) => {
  const { data } = await axios.post(`${API}/ai/suggest-assumptions`, {
    industry,
    business_model: businessModel,
    item_name: itemName,
    months,
    price: price || null,
  });
  return data;
};
