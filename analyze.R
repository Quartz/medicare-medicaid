library(dplyr)
library(readr)
library(stringr)

election <- read_csv('data/2016_0_0_2.csv', skip = 1) %>%
  mutate(trump_pct = vote2 / totalvote * 100) %>%
  select(fips, name, trump_pct)

medicaid <- read_csv('data/ACS_15_5YR_C27007/ACS_15_5YR_C27007.csv') %>%
  slice(2:n()) %>%
  transmute(
    fips = as.numeric(str_sub(`GEO.id`, -5)),
    pop = as.numeric(HD01_VD01),
    medicaid = 
      as.numeric(HD01_VD04) + 
      as.numeric(HD01_VD07) +
      as.numeric(HD01_VD10) +
      as.numeric(HD01_VD14) +
      as.numeric(HD01_VD17) +
      as.numeric(HD01_VD20),
    no_medicaid =
      as.numeric(HD01_VD05) +
      as.numeric(HD01_VD08) +
      as.numeric(HD01_VD11) +
      as.numeric(HD01_VD15) +
      as.numeric(HD01_VD18) +
      as.numeric(HD01_VD21),
    medicaid_pct = medicaid / pop * 100
  ) %>%
  select(fips, medicaid_pct)

merged <- election %>%
  left_join(medicaid) 

write_csv(merged, 'src/data/data.csv')

quantile(merged$trump_pct, c(0.333, 0.666))
quantile(merged$medicaid_pct, c(0.333, 0.666), na.rm = TRUE)




