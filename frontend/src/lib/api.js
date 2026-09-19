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

export const exportXlsx = async (state, labels) => {
  const { data } = await axios.post(
    `${API}/export/xlsx`,
    {
      business_name: state.businessName,
      industry: state.industry,
      months: state.months,
      labels,
      categories: state.categories.map((c) => ({ id: c.id, name: c.name })),
      items: state.items.map((i) => ({
        name: i.name,
        category_id: i.categoryId,
        price: Number(i.price) || 0,
        unit_cost: Number(i.unitCost) || 0,
        units: (i.units || []).slice(0, state.months).map((u) => Number(u) || 0),
      })),
    },
    { responseType: "blob" }
  );
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
