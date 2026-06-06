import JapaneseHubHome from "@/components/JapaneseHubHome";

const Japanese = () => {
  return <JapaneseHubHome />;
};

export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

export default Japanese;
